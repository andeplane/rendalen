import { currentValue } from './freshness';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { parseISO } from 'date-fns';
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
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(DATA_JSON_URL, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Kunne ikke laste data');
        const next = await response.json() as WeatherData;
        if (!next.sensors || !next.updatedAt) throw new Error('Ugyldige sensordata');
        setData(next);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Kunne ikke laste data');
      }
    };
    void load();
    const refresh = setInterval(() => { void load(); }, 5 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => { controller.abort(); clearInterval(refresh); clearInterval(tick); };
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

  if (error && !data) {
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

  const parsedSync = parseISO(data.updatedAt);
  const updatedStr = Number.isFinite(parsedSync.getTime())
    ? new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' }).format(parsedSync)
    : 'ukjent tidspunkt';
  const stale = Object.values(data.sensors).some((sensor) =>
    Object.values(sensor).some((metric) => currentValue(metric, now) === null));

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header__icon">🏡</div>
          <div className="header__text">
            <h1 className="header__title">Hytta Vær</h1>
            <p className="header__sub">Rendalen · Sist synkronisert {updatedStr}</p>
          </div>
        </header>

        {(stale || error) && <p className="freshness-notice" role="status">
          {error ? 'Kunne ikke synkronisere på nytt. ' : ''}
          Målinger eldre enn 30 minutter skjules. Se «Sist målt» ved hver måling.
        </p>}

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
