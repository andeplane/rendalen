"""
Fetch Rendalen cabin sensor datapoints from CDF and upload JSON to GCS.

Environment (Cognite — same pattern as cognite auth.py):
  ANDERSHAF_TENANTID, ANDERSHAF_CLIENTID, ANDERSHAF_CLIENTSECRET
  CDF_PROJECT (default: andershaf), CDF_CLUSTER (default: api)

Environment (GCS):
  GCS_BUCKET (default: rendalen-weather)
  GCS_OBJECT (default: rendalen/data.json)
  GOOGLE_APPLICATION_CREDENTIALS — path to SA JSON locally, or use GCP_KEY in CI

Optional:
  RENDALEN_OUTPUT_LOCAL=1 — write ./data.json only, skip GCS (for dry runs without GCP auth)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

from cognite.client import CogniteClient, ClientConfig
from cognite.client.credentials import OAuthClientCredentials
from cognite.client.data_classes.data_modeling import NodeId


SENSORS = {
    "stua": [
        "stua_temperature",
        "stua_co2",
        "stua_humidity",
        "stua_noise",
        "stua_pressure",
    ],
    "ute": ["ute_temperature", "ute_humidity", "ute_battery_percent"],
    "kjøkkenet": [
        "kjøkkenet_temperature",
        "kjøkkenet_humidity",
        "kjøkkenet_battery_percent",
        "kjøkkenet_co2",
    ],
}
SPACE = "nydalen"


def create_cognite_client() -> CogniteClient:
    tenant_id = os.environ.get("ANDERSHAF_TENANTID") or os.environ.get("COGNITE_TENANT_ID")
    client_id = os.environ.get("ANDERSHAF_CLIENTID") or os.environ.get("COGNITE_CLIENT_ID")
    client_secret = os.environ.get("ANDERSHAF_CLIENTSECRET") or os.environ.get(
        "COGNITE_CLIENT_SECRET"
    )
    cluster = os.environ.get("CDF_CLUSTER", "api")
    project = os.environ.get("CDF_PROJECT", "andershaf")

    if not all([tenant_id, client_id, client_secret]):
        print(
            "Missing Cognite OAuth env: ANDERSHAF_TENANTID, ANDERSHAF_CLIENTID, "
            "ANDERSHAF_CLIENTSECRET",
            file=sys.stderr,
        )
        sys.exit(1)

    base_url = f"https://{cluster}.cognitedata.com"
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    scopes = [f"https://{cluster}.cognitedata.com/.default"]

    oauth = OAuthClientCredentials(
        token_url=token_url,
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes,
    )
    config = ClientConfig(
        project=project,
        client_name="rendalen-sensor-fetch",
        credentials=oauth,
        base_url=base_url,
        timeout=120,
    )
    return CogniteClient(config)


def build_payload(client: CogniteClient) -> dict:
    timeseries_node_ids: list[NodeId] = []
    for ts_list in SENSORS.values():
        for ts_ext_id in ts_list:
            timeseries_node_ids.append(NodeId(SPACE, ts_ext_id))

    print(f"Fetching data for {len(timeseries_node_ids)} time series...")
    dp_list = client.time_series.data.retrieve(
        instance_id=timeseries_node_ids,
        start="180d-ago",
        end="now",
        aggregates=["average"],
        granularity="1h",
        ignore_unknown_ids=True,
    )
    print(f"Fetched datapoints for {len(dp_list)} time series.")

    result = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sensors": {},
    }

    for asset, ts_list in SENSORS.items():
        result["sensors"][asset] = {}
        for ts_ext_id in ts_list:
            dp = None
            target = NodeId(SPACE, ts_ext_id)
            for d in dp_list:
                d_inst = getattr(d, "instance_id", None)
                d_ext = getattr(d, "external_id", None)
                if d_inst == target or (
                    isinstance(d_inst, dict)
                    and d_inst.get("space") == SPACE
                    and d_inst.get("externalId") == ts_ext_id
                ):
                    dp = d
                    break
                if d_ext == ts_ext_id:
                    dp = d
                    break

            if dp and len(dp) > 0:
                history = []
                for p in dp:
                    val = getattr(p, "average", None)
                    if val is not None:
                        history.append(
                            {
                                "timestamp": datetime.fromtimestamp(
                                    p.timestamp / 1000.0, tz=timezone.utc
                                ).isoformat(),
                                "value": val,
                            }
                        )
                latest = history[-1]["value"] if history else None
                result["sensors"][asset][ts_ext_id] = {
                    "latest": latest,
                    "history": history,
                }
            else:
                result["sensors"][asset][ts_ext_id] = {
                    "latest": None,
                    "history": [],
                }

    return result


def upload_gcs(payload: dict, bucket: str, object_name: str) -> None:
    from google.cloud import storage

    body = json.dumps(payload, indent=2).encode("utf-8")
    client = storage.Client()
    blob = client.bucket(bucket).blob(object_name)
    blob.cache_control = "public, max-age=300"
    blob.upload_from_string(body, content_type="application/json; charset=utf-8")
    print(f"Uploaded gs://{bucket}/{object_name} ({len(body)} bytes)")


def main() -> None:
    client = create_cognite_client()
    payload = build_payload(client)
    body = json.dumps(payload, indent=2).encode("utf-8")

    if os.environ.get("RENDALEN_OUTPUT_LOCAL") == "1":
        out = os.environ.get("RENDALEN_OUTPUT_PATH", "data.json")
        with open(out, "wb") as f:
            f.write(body)
        print(f"Wrote {out} ({len(body)} bytes)")
        return

    bucket = os.environ.get("GCS_BUCKET", "rendalen-weather")
    object_name = os.environ.get("GCS_OBJECT", "rendalen/data.json")
    upload_gcs(payload, bucket, object_name)


if __name__ == "__main__":
    main()
