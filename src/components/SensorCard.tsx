import type { SensorData, SensorName } from '../types';
import { degreesToCompassNorwegian, formatTemp, getTemperatureKey } from '../utils';

interface Props {
  name: SensorName;
  data: SensorData;
  selected: boolean;
  onClick: () => void;
}

const SENSOR_CONFIG: Record<SensorName, { label: string; icon: string }> = {
  ute: { label: 'Ute', icon: '☀️' },
  kjøkkenet: { label: 'Kjøkkenet', icon: '🫖' },
  stua: { label: 'Stua', icon: '🛋️' },
};

function uteWindSummary(data: SensorData): string | null {
  const speedEntry = Object.entries(data).find(([k]) => k.endsWith('_windstrength'));
  const angleEntry = Object.entries(data).find(([k]) => k.endsWith('_windangle'));
  const speed = speedEntry?.[1]?.latest;
  const angle = angleEntry?.[1]?.latest;
  if (typeof speed !== 'number' || Number.isNaN(speed)) {
    if (typeof angle !== 'number' || Number.isNaN(angle)) return null;
    return degreesToCompassNorwegian(angle);
  }
  const km = `${Math.round(speed * 10) / 10} km/h`;
  if (typeof angle === 'number' && !Number.isNaN(angle)) {
    return `${km} · ${degreesToCompassNorwegian(angle)}`;
  }
  return km;
}

export default function SensorCard({ name, data, selected, onClick }: Props) {
  const config = SENSOR_CONFIG[name];
  const tempKey = getTemperatureKey(name);
  const temp = data[tempKey]?.latest;
  const humidityKey = `${name}_humidity`;
  const humidity = data[humidityKey]?.latest;
  const windSummary = name === 'ute' ? uteWindSummary(data) : null;

  return (
    <button className={`sensor-card ${selected ? 'sensor-card--selected' : ''}`} onClick={onClick}>
      <div className="sensor-card__icon">{config.icon}</div>
      <div className="sensor-card__name">{config.label}</div>
      <div className="sensor-card__temp">{temp !== undefined ? formatTemp(temp) : '—'}</div>
      {humidity !== undefined && (
        <div className="sensor-card__humidity">{Math.round(humidity)}% RH</div>
      )}
      {windSummary !== null && <div className="sensor-card__wind">💨 {windSummary}</div>}
    </button>
  );
}
