import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from datetime import datetime, timezone
spec = importlib.util.spec_from_file_location('exporter', Path(__file__).resolve().parents[1] / 'scripts/fetch_sensor_data.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

class LatestMeasurementTests(unittest.TestCase):
    def test_sdk7_list_and_sdk8_scalar_are_equivalent(self):
        old = SimpleNamespace(value=[0.0], timestamp=[1793047200000])
        new = SimpleNamespace(value=0.0, timestamp=datetime(2026, 10, 26, 20, 40, tzinfo=timezone.utc))
        self.assertEqual(exporter.latest_measurement(old), exporter.latest_measurement(new))
        self.assertEqual(exporter.latest_measurement(new), (0.0, '2026-10-26T20:40:00+00:00'))
    def test_actual_sdk8_latest_datapoint(self):
        try:
            from cognite.client.data_classes.datapoints import LatestDatapoint
        except ImportError:
            self.skipTest('LatestDatapoint is only present in SDK 8')
        dp = LatestDatapoint(id=1, timestamp=datetime(2026, 10, 26, 20, 40, tzinfo=timezone.utc), value=0.0,
                             is_string=False, type='numeric', before=None)
        self.assertEqual(exporter.latest_measurement(dp), (0.0, '2026-10-26T20:40:00+00:00'))

    def test_missing_readings_are_not_fabricated(self):
        self.assertEqual(exporter.latest_measurement(None), (None, None))
        self.assertEqual(exporter.latest_measurement(SimpleNamespace(value=[], timestamp=[])), (None, None))
if __name__ == '__main__': unittest.main()
