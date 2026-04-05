import type { DataPoint, TimeRange } from './types';
import { subHours, subDays, subMonths, parseISO } from 'date-fns';

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
