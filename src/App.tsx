import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { WeatherData, SensorName, TimeRange, TrendChartMetric } from './types';
import { getAvailableTrendMetrics, getSensorMetricKey } from './utils';
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

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const DATA_JSON_URL =
  import.meta.env.VITE_DATA_JSON_URL || `${baseUrl}data.json`;

export default function App() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [selected, setSelected] = useState<SensorName>('ute');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [trendMetric, setTrendMetric] = useState<TrendChartMetric>('temperature');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(DATA_JSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error('Kunne ikke laste data');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const selectedSensor = data?.sensors[selected];

  const availableTrendMetrics = useMemo(
    () => getAvailableTrendMetrics(selected, selectedSensor),
    [selected, selectedSensor],
  );

  const effectiveTrendMetric = useMemo((): TrendChartMetric => {
    if (!data) return trendMetric;
    const avail = getAvailableTrendMetrics(selected, data.sensors[selected]);
    if (avail.length === 0) return 'temperature';
    if (avail.includes(trendMetric)) return trendMetric;
    return avail.includes('temperature') ? 'temperature' : avail[0]!;
  }, [data, selected, trendMetric]);

  const selectSensor = useCallback(
    (sensor: SensorName) => {
      setSelected(sensor);
      if (!data) return;
      const avail = getAvailableTrendMetrics(sensor, data.sensors[sensor]);
      setTrendMetric(avail.includes('temperature') ? 'temperature' : (avail[0] ?? 'temperature'));
    },
    [data],
  );

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

  const singleHistory =
    effectiveTrendMetric === 'wind'
      ? []
      : (data.sensors[selected]?.[getSensorMetricKey(selected, effectiveTrendMetric)]?.history ?? []);

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
                onClick={() => selectSensor(sensor)}
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
              sensor={selected}
              sensorLabel={SENSOR_LABELS[selected]}
              sensorData={data.sensors[selected]}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              trendMetric={effectiveTrendMetric}
              onTrendMetricChange={setTrendMetric}
              availableTrendMetrics={availableTrendMetrics}
              singleHistory={singleHistory}
            />
            <MetricsPanel data={data.sensors[selected]} />
          </div>
        </section>

        <StatsTable data={data} />
      </div>
    </div>
  );
}
