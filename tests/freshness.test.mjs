import test from 'node:test';
import assert from 'node:assert/strict';
import { currentValue, measurementTime } from '../src/freshness.ts';
import { filterByTimeRange } from '../src/utils.ts';
const now = Date.parse('2026-10-26T20:45:00Z');
const metric = (latestAt, latest = 10) => ({ latest, latestAt, history: [] });
test('only fresh finite values are current', () => {
  assert.equal(currentValue(metric('2026-10-26T20:40:00Z'), now), 10);
  assert.equal(currentValue(metric('2026-07-09T08:00:00Z'), now), null);
  assert.equal(currentValue(metric('invalid'), now), null);
  assert.equal(currentValue(metric('2026-10-26T21:00:00Z'), now), null);
  assert.equal(currentValue(metric('2026-10-26T20:40:00Z', null), now), null);
  assert.equal(currentValue(metric('2026-10-26T20:40:00Z', NaN), now), null);
});
test('fresh export cannot make old measurements fresh', () => {
  const old = { latest: 18.3, history: [{ timestamp: '2026-07-09T08:00:00Z', value: 18.3 }] };
  assert.equal(currentValue(old, now), null);
  assert.equal(measurementTime(old), Date.parse('2026-07-09T08:00:00Z'));
});
test('empty selected ranges stay empty rather than showing months of old data', () => {
  for (const range of ['24h', 'week', 'month']) {
    assert.deepEqual(filterByTimeRange([{ timestamp: '2000-01-01T00:00:00Z', value: 10 }], range), []);
  }
});
