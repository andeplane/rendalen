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
