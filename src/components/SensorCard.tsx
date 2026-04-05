import type { SensorData, SensorName } from '../types';
import { formatTemp, getTemperatureKey } from '../utils';

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

export default function SensorCard({ name, data, selected, onClick }: Props) {
  const config = SENSOR_CONFIG[name];
  const tempKey = getTemperatureKey(name);
  const temp = data[tempKey]?.latest;
  const humidityKey = `${name}_humidity`;
  const humidity = data[humidityKey]?.latest;

  return (
    <button className={`sensor-card ${selected ? 'sensor-card--selected' : ''}`} onClick={onClick}>
      <div className="sensor-card__icon">{config.icon}</div>
      <div className="sensor-card__name">{config.label}</div>
      <div className="sensor-card__temp">{temp !== undefined ? formatTemp(temp) : '—'}</div>
      {humidity !== undefined && (
        <div className="sensor-card__humidity">{Math.round(humidity)}% RH</div>
      )}
    </button>
  );
}
