import type { DataPoint, SensorData, SensorName, TimeRange, TrendChartMetric, WindChartRow } from './types';
import { format, subHours, subDays, subMonths, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

/** Shared X-axis tick / row labels for trend charts. */
export function formatTrendChartXAxisLabel(timestamp: string, range: TimeRange): string {
  const date = parseISO(timestamp);
  if (range === '24h') return format(date, 'HH:mm', { locale: nb });
  if (range === 'week') return format(date, 'EEE HH:mm', { locale: nb });
  return format(date, 'd. MMM', { locale: nb });
}

export function filterByTimeRange(history: DataPoint[], range: TimeRange): DataPoint[] {
  const now = new Date();
  let cutoff: Date;
  switch (range) {
    case '24h':
      cutoff = subHours(now, 24);
      break;
    case 'week':
      cutoff = subDays(now, 7);
      break;
    case 'month':
      cutoff = subMonths(now, 1);
      break;
  }
  const filtered = history.filter((d) => parseISO(d.timestamp) >= cutoff);
  // If no data in range, return all available data
  return filtered.length > 0 ? filtered : history;
}

export function getMin(data: DataPoint[]): DataPoint | null {
  if (data.length === 0) return null;
  return data.reduce((min, d) => (d.value < min.value ? d : min), data[0]);
}

export function getMax(data: DataPoint[]): DataPoint | null {
  if (data.length === 0) return null;
  return data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);
}

export function formatTemp(value: number): string {
  return `${Math.round(value * 10) / 10}°C`;
}

export function getTemperatureKey(sensorName: string): string {
  return `${sensorName}_temperature`;
}

/** Meteorological degrees clockwise from north (0° = N, 90° = Ø). */
const COMPASS_NB = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'] as const;

export function degreesToCompassNorwegian(deg: number): string {
  const n = ((deg % 360) + 360) % 360;
  const idx = Math.floor((n + 22.5) / 45) % 8;
  return COMPASS_NB[idx];
}

const TREND_METRIC_ORDER: TrendChartMetric[] = ['temperature', 'pressure', 'co2', 'wind'];

export function getSensorMetricKey(sensor: SensorName, field: 'temperature' | 'pressure' | 'co2'): string {
  return `${sensor}_${field}`;
}

export function getWindStrengthKey(sensor: SensorName): string {
  return `${sensor}_windstrength`;
}

export function getWindGustKey(sensor: SensorName): string {
  return `${sensor}_guststrength`;
}

export function getWindAngleKey(sensor: SensorName): string {
  return `${sensor}_windangle`;
}

const WIND_STRENGTH_SUFFIX = '_windstrength';

/** Resolved keys for a module-style external id (e.g. smart_anemometer_windstrength). */
export interface ResolvedWindKeys {
  strength: string;
  gust: string;
  angle: string;
}

/**
 * Find wind time series on this sensor: any `*_windstrength` key (CDF external id prefix + suffix).
 * Picks the first key alphabetically if several exist. Falls back to `{sensor}_windstrength` when present.
 */
export function resolveWindSeriesKeys(sensor: SensorName, data: SensorData | undefined): ResolvedWindKeys | null {
  if (!data) return null;
  const candidates = Object.keys(data)
    .filter((k) => k.endsWith(WIND_STRENGTH_SUFFIX) && data[k] != null)
    .sort();
  const strengthKey = candidates[0];
  if (strengthKey) {
    const base = strengthKey.slice(0, -WIND_STRENGTH_SUFFIX.length);
    return {
      strength: strengthKey,
      gust: `${base}_guststrength`,
      angle: `${base}_windangle`,
    };
  }
  const legacy = getWindStrengthKey(sensor);
  if (data[legacy]) {
    return {
      strength: legacy,
      gust: getWindGustKey(sensor),
      angle: getWindAngleKey(sensor),
    };
  }
  return null;
}

function hasHistory(sensor: SensorData | undefined, key: string): boolean {
  const h = sensor?.[key]?.history;
  return Array.isArray(h) && h.length > 0;
}

function hasFiniteLatest(sensor: SensorData | undefined, key: string): boolean {
  const v = sensor?.[key]?.latest;
  return typeof v === 'number' && !Number.isNaN(v);
}

export function getAvailableTrendMetrics(sensor: SensorName, data: SensorData | undefined): TrendChartMetric[] {
  if (!data) return [];
  return TREND_METRIC_ORDER.filter((m) => {
    if (m === 'wind') {
      const wk = resolveWindSeriesKeys(sensor, data);
      if (!wk) return false;
      return hasHistory(data, wk.strength) || hasFiniteLatest(data, wk.strength);
    }
    return hasHistory(data, getSensorMetricKey(sensor, m));
  });
}

/**
 * Merge wind / gust / angle histories (same time range filter). Rows follow wind strength timestamps.
 */
export function buildWindChartRows(sensor: SensorName, data: SensorData | undefined, range: TimeRange): WindChartRow[] {
  if (!data) return [];
  const keys = resolveWindSeriesKeys(sensor, data);
  if (!keys) return [];
  const wKey = keys.strength;
  const gKey = keys.gust;
  const aKey = keys.angle;
  const windHist = filterByTimeRange(data[wKey]?.history ?? [], range);
  if (windHist.length === 0) return [];
  const gustHist = filterByTimeRange(data[gKey]?.history ?? [], range);
  const angleHist = filterByTimeRange(data[aKey]?.history ?? [], range);
  const gustMap = new Map(gustHist.map((d) => [d.timestamp, d.value]));
  const angleMap = new Map(angleHist.map((d) => [d.timestamp, d.value]));
  return windHist.map((d) => ({
    timestamp: d.timestamp,
    label: formatTrendChartXAxisLabel(d.timestamp, range),
    wind: Math.round(d.value * 10) / 10,
    gust: gustMap.has(d.timestamp) ? Math.round(gustMap.get(d.timestamp)! * 10) / 10 : null,
    angle: angleMap.has(d.timestamp) ? angleMap.get(d.timestamp)! : null,
  }));
}

export function nearestWindRowByTime(rows: WindChartRow[], targetIso: string): WindChartRow | null {
  if (rows.length === 0) return null;
  const t = parseISO(targetIso).getTime();
  if (Number.isNaN(t)) return null;
  let best = rows[0];
  let bestDt = Math.abs(parseISO(best.timestamp).getTime() - t);
  for (let i = 1; i < rows.length; i++) {
    const dt = Math.abs(parseISO(rows[i].timestamp).getTime() - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = rows[i];
    }
  }
  return best;
}
