import type { SensorData } from '../types';
import { degreesToCompassNorwegian } from '../utils';

interface Props {
  data: SensorData;
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; icon: string }> = {
  temperature: { label: 'Temperatur', unit: '°C', icon: '🌡️' },
  humidity: { label: 'Luftfuktighet', unit: '%', icon: '💧' },
  co2: { label: 'CO₂', unit: 'ppm', icon: '🌿' },
  noise: { label: 'Støy', unit: 'dB', icon: '🔊' },
  pressure: { label: 'Lufttrykk', unit: 'hPa', icon: '🌀' },
  battery_percent: { label: 'Batteri', unit: '%', icon: '🔋' },
  windstrength: { label: 'Vind', unit: 'km/h', icon: '💨' },
  guststrength: { label: 'Vindkast', unit: 'km/h', icon: '🌬️' },
  windangle: { label: 'Vindretning', unit: '', icon: '🧭' },
  gustangle: { label: 'Kast retning', unit: '', icon: '🧭' },
};

function getMetricType(key: string): string {
  for (const type of Object.keys(METRIC_CONFIG)) {
    if (key.endsWith(type)) return type;
  }
  return '';
}

export default function MetricsPanel({ data }: Props) {
  const entries = Object.entries(data).filter(([key]) => !key.endsWith('temperature'));

  return (
    <div className="metrics-panel">
      {entries.map(([key, metric]) => {
        const type = getMetricType(key);
        const config = METRIC_CONFIG[type];
        if (!config) return null;

        const value = metric.latest;
        const displayValue =
          type === 'temperature'
            ? `${Math.round(value * 10) / 10}${config.unit}`
            : type === 'humidity' || type === 'battery_percent'
            ? `${Math.round(value)}${config.unit}`
            : type === 'co2'
            ? `${Math.round(value)} ${config.unit}`
            : type === 'pressure'
            ? `${Math.round(value)} ${config.unit}`
            : type === 'windstrength' || type === 'guststrength'
            ? `${Math.round(value * 10) / 10} ${config.unit}`
            : type === 'windangle' || type === 'gustangle'
            ? typeof value === 'number' && !Number.isNaN(value)
              ? `${degreesToCompassNorwegian(value)} (${Math.round(value)}°)`
              : '—'
            : `${Math.round(value * 10) / 10} ${config.unit}`;

        return (
          <div key={key} className="metric-chip">
            <span className="metric-chip__icon">{config.icon}</span>
            <div className="metric-chip__content">
              <span className="metric-chip__label">{config.label}</span>
              <span className="metric-chip__value">{displayValue}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
