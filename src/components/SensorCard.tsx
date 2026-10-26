import { currentValue, measurementLabel } from '../freshness';
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
  const speed = currentValue(speedEntry?.[1]);
  const angle = currentValue(angleEntry?.[1]);
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
  const temp = currentValue(data[tempKey]);
  const humidityKey = `${name}_humidity`;
  const humidity = currentValue(data[humidityKey]);
  const windSummary = name === 'ute' ? uteWindSummary(data) : null;

  return (
    <button className={`sensor-card ${selected ? 'sensor-card--selected' : ''}`} onClick={onClick}>
      <div className="sensor-card__icon">{config.icon}</div>
      <div className="sensor-card__name">{config.label}</div>
      <div className="sensor-card__temp">{temp !== null ? formatTemp(temp) : '—'}</div>
      {humidity !== null && (
        <div className="sensor-card__humidity">{Math.round(humidity)}% RH</div>
      )}
      <div className="sensor-card__sync">{measurementLabel(data[tempKey])}</div>
      {temp === null && <div className="sensor-card__stale">Ingen ferske målinger</div>}
      {windSummary !== null && <div className="sensor-card__wind">💨 {windSummary}</div>}
    </button>
  );
}
