import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { WeatherData, SensorName, TimeRange } from './types';
import { getTemperatureKey } from './utils';
import SensorCard from './components/SensorCard';
import TrendChart from './components/TrendChart';
import StatsTable from './components/StatsTable';
import MetricsPanel from './components/MetricsPanel';

const SENSORS: SensorName[] = ['ute', 'kjøkkenet', 'stua'];
const SENSOR_LABELS: Record<SensorName, string> = {
  ute: 'Ute',
  kjøkkenet: 'Kjøkkenet',
  stua: 'Stua',
};

export default function App() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [selected, setSelected] = useState<SensorName>('ute');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data.json')
      .then((r) => {
        if (!r.ok) throw new Error('Kunne ikke laste data');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="app">
        <div className="error-state">⚠️ {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app">
        <div className="loading-state">Laster...</div>
      </div>
    );
  }

  const selectedSensor = data.sensors[selected];
  const tempKey = getTemperatureKey(selected);
  const tempHistory = selectedSensor?.[tempKey]?.history ?? [];

  const updatedStr = format(parseISO(data.updatedAt), "d. MMMM HH:mm", { locale: nb });

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header__icon">🏡</div>
          <div className="header__text">
            <h1 className="header__title">Hytta Vær</h1>
            <p className="header__sub">Rendalen · Oppdatert {updatedStr}</p>
          </div>
        </header>

        <section>
          <div className="section-header">
            <span className="section-header__title">SISTE MÅLINGER</span>
            <span className="section-header__sub">REAL-TIME READINGS</span>
          </div>
          <div className="sensor-grid">
            {SENSORS.map((sensor) => (
              <SensorCard
                key={sensor}
                name={sensor}
                data={data.sensors[sensor]}
                selected={selected === sensor}
                onClick={() => setSelected(sensor)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="section-header">
            <span className="section-header__title">HISTORIKK & TRENDER</span>
            <span className="section-header__sub">HISTORY & TRENDS</span>
          </div>
          <div className="chart-card">
            <TrendChart
              history={tempHistory}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              sensorLabel={SENSOR_LABELS[selected]}
            />
            <MetricsPanel data={selectedSensor} />
          </div>
        </section>

        <StatsTable data={data} />
      </div>
    </div>
  );
}
