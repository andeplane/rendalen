import type { Metric } from './types';

export const MAX_MEASUREMENT_AGE_MS = 30 * 60 * 1000;

export function measurementTime(metric: Metric | undefined): number | null {
  if (!metric) return null;
  const timestamp = metric.latestAt ?? metric.history?.at(-1)?.timestamp;
  if (!timestamp) return null;
  const time = Date.parse(timestamp);
  return Number.isFinite(time) ? time : null;
}

export function currentValue(metric: Metric | undefined, now = Date.now()): number | null {
  const time = measurementTime(metric);
  const value = metric?.latest;
  if (time === null || time > now + 5 * 60 * 1000 || now - time > MAX_MEASUREMENT_AGE_MS) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function measurementLabel(metric: Metric | undefined): string {
  const time = measurementTime(metric);
  if (time === null) return 'Ingen målinger mottatt';
  return `Sist målt ${new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo',
  }).format(time)}`;
}
