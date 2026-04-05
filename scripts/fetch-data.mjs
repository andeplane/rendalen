/**
 * Downloads live weather JSON from GCS into public/data.json (dev / local builds).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GCS_DATA_URL = 'https://storage.googleapis.com/rendalen-weather/rendalen/data.json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'data.json');

const res = await fetch(GCS_DATA_URL);
if (!res.ok) {
  throw new Error(`Failed to fetch ${GCS_DATA_URL}: ${res.status} ${res.statusText}`);
}

await mkdir(dirname(outPath), { recursive: true });
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);
