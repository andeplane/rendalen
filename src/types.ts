export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface Metric {
  latest: number;
  history: DataPoint[];
}

export interface SensorData {
  [key: string]: Metric;
}

export interface WeatherData {
  updatedAt: string;
  sensors: {
    ute: SensorData;
    kjøkkenet: SensorData;
    stua: SensorData;
    [key: string]: SensorData;
  };
}

export type SensorName = 'ute' | 'kjøkkenet' | 'stua';
export type TimeRange = '24h' | 'week' | 'month';

/** Trend chart metric selection (subset of sensor fields with history). */
export type TrendChartMetric = 'temperature' | 'pressure' | 'co2' | 'wind';

export interface WindChartRow {
  timestamp: string;
  /** X-axis tick label (may duplicate across rows; chart uses `timestamp` as key). */
  label: string;
  wind: number | null;
  gust: number | null;
  /** Degrees clockwise from north (wind from); matches `degreesToCompassNorwegian`. */
  angle: number | null;
}
