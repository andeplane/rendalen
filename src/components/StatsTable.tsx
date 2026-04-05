import type { WeatherData, SensorName } from '../types';
import { filterByTimeRange, getMin, getMax, getTemperatureKey } from '../utils';

interface Props {
  data: WeatherData;
}

const SENSORS: SensorName[] = ['ute', 'kjøkkenet', 'stua'];
const SENSOR_LABELS: Record<SensorName, string> = {
  ute: 'Ute',
  kjøkkenet: 'Kjøkkenet',
  stua: 'Stua',
};

export default function StatsTable({ data }: Props) {
  return (
    <div className="stats-table-card">
      <div className="section-header">
        <span className="section-header__title">24T & UKE HI/LO</span>
        <span className="section-header__sub">SISTE DØGN & UKE</span>
      </div>
      <table className="stats-table">
        <thead>
          <tr>
            <th></th>
            <th>24t Maks</th>
            <th>24t Min</th>
            <th>Uke Maks</th>
            <th>Uke Min</th>
          </tr>
        </thead>
        <tbody>
          {SENSORS.map((sensor) => {
            const sensorData = data.sensors[sensor];
            const tempKey = getTemperatureKey(sensor);
            const metric = sensorData?.[tempKey];
            if (!metric) return null;

            const day = filterByTimeRange(metric.history, '24h');
            const week = filterByTimeRange(metric.history, 'week');

            const dayMax = getMax(day);
            const dayMin = getMin(day);
            const weekMax = getMax(week);
            const weekMin = getMin(week);

            const fmt = (v: number | undefined) =>
              v !== undefined ? `${Math.round(v * 10) / 10}°` : '—';

            return (
              <tr key={sensor}>
                <td className="stats-table__label">{SENSOR_LABELS[sensor]}</td>
                <td className="stats-table__high">{fmt(dayMax?.value)}</td>
                <td className="stats-table__low">{fmt(dayMin?.value)}</td>
                <td className="stats-table__high">{fmt(weekMax?.value)}</td>
                <td className="stats-table__low">{fmt(weekMin?.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
