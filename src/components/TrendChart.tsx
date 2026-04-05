import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
  useXAxisScale,
  useYAxisScale,
  useXAxisTicks,
} from 'recharts';
import type { DataPoint, SensorData, SensorName, TimeRange, TrendChartMetric, WindChartRow } from '../types';
import {
  buildWindChartRows,
  filterByTimeRange,
  formatTrendChartXAxisLabel,
  getMin,
  getMax,
  nearestWindRowByTime,
} from '../utils';

interface Props {
  sensor: SensorName;
  sensorLabel: string;
  sensorData: SensorData;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  trendMetric: TrendChartMetric;
  onTrendMetricChange: (m: TrendChartMetric) => void;
  availableTrendMetrics: TrendChartMetric[];
  singleHistory: DataPoint[];
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '24h': '24 timer',
  week: 'Siste uke',
  month: 'Siste måned',
};

const METRIC_LABELS: Record<TrendChartMetric, string> = {
  temperature: 'Temperatur',
  pressure: 'Lufttrykk',
  co2: 'CO₂',
  wind: 'Vind',
};

const SINGLE_METRIC_TOOLTIP: Record<
  Exclude<TrendChartMetric, 'wind'>,
  { name: string; suffix: string; formatter: (v: number) => string }
> = {
  temperature: {
    name: 'Temperatur',
    suffix: '°C',
    formatter: (v) => `${v}°C`,
  },
  pressure: {
    name: 'Lufttrykk',
    suffix: 'hPa',
    formatter: (v) => `${Math.round(v)} hPa`,
  },
  co2: {
    name: 'CO₂',
    suffix: 'ppm',
    formatter: (v) => `${Math.round(v)} ppm`,
  },
};

/**
 * Arrow points in the direction wind comes **from** (meteorological bearing, ° clockwise from north).
 * SVG path points along +x; rotate by (bearing - 90) so N (0°) points up on screen.
 */
function WindArrowsOverlay({ rows }: { rows: WindChartRow[] }) {
  const yScale = useYAxisScale();
  const ticks = useXAxisTicks();
  const xScale = useXAxisScale();

  if (!yScale || !ticks?.length || rows.length === 0) return null;

  return (
    <g className="wind-arrows-overlay" aria-hidden>
      {ticks.map((tick, i) => {
        const ts = tick.value != null ? String(tick.value) : '';
        if (!ts) return null;
        const row = nearestWindRowByTime(rows, ts);
        if (!row || row.angle == null || row.wind == null) return null;
        const x =
          typeof tick.coordinate === 'number'
            ? tick.coordinate
            : (xScale?.(row.timestamp) ?? null);
        const y = yScale(row.wind);
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        const rot = row.angle - 90;
        return (
          <g key={`wind-arr-${i}-${ts}`} transform={`translate(${x},${y - 14}) rotate(${rot})`}>
            <path d="M 6 0 L -4 -3 L -2 0 L -4 3 Z" fill="#5a4a3a" opacity={0.88} />
          </g>
        );
      })}
    </g>
  );
}

export default function TrendChart({
  sensor,
  sensorLabel,
  sensorData,
  timeRange,
  onTimeRangeChange,
  trendMetric,
  onTrendMetricChange,
  availableTrendMetrics,
  singleHistory,
}: Props) {
  const isWind = trendMetric === 'wind';
  const windRows = isWind ? buildWindChartRows(sensor, sensorData, timeRange) : [];

  if (isWind) {
    const windVals = windRows.map((r) => r.wind).filter((v): v is number => v != null);
    const gustVals = windRows.map((r) => r.gust).filter((v): v is number => v != null);
    const allY = [...windVals, ...gustVals];
    const hasData = allY.length > 0;
    const yMin = hasData ? Math.floor(Math.min(...allY)) - 1 : 0;
    const yMax = hasData ? Math.ceil(Math.max(...allY)) + 1 : 10;

    return (
      <div className="trend-chart">
        <div className="trend-chart__header">
          <h3 className="trend-chart__title">{sensorLabel}</h3>
          <div className="trend-chart__buttons">
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`time-btn ${timeRange === r ? 'time-btn--active' : ''}`}
                onClick={() => onTimeRangeChange(r)}
              >
                {TIME_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {!hasData ? (
          <div className="trend-chart__empty">Ingen data for denne målingen</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={windRows}
              margin={{ top: 20, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11, fill: '#8a7a6a' }}
                tickFormatter={(ts) => formatTrendChartXAxisLabel(String(ts), timeRange)}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fill: '#8a7a6a' }}
                tickFormatter={(v) => `${v} km/h`}
              />
              <Tooltip
                formatter={(val, name) => {
                  if (val == null || typeof val !== 'number') return ['—', String(name)];
                  return [`${val} km/h`, String(name)];
                }}
                labelFormatter={(ts) => formatTrendChartXAxisLabel(String(ts), timeRange)}
                labelStyle={{ color: '#5a4a3a', fontWeight: 600 }}
                contentStyle={{
                  background: '#fff8f0',
                  border: '1px solid #d4c4b0',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                formatter={(value) => <span style={{ color: '#5a4a3a' }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="wind"
                name="Vind"
                stroke="#5b8fc9"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                activeDot={{ r: 5, fill: '#5b8fc9' }}
              />
              <Line
                type="monotone"
                dataKey="gust"
                name="Vindkast"
                stroke="#c97b5b"
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 5, fill: '#c97b5b' }}
              />
              <WindArrowsOverlay rows={windRows} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="trend-chart__metric-buttons">
          {availableTrendMetrics.map((m) => (
            <button
              key={m}
              type="button"
              className={`time-btn trend-chart__metric-btn ${trendMetric === m ? 'time-btn--active' : ''}`}
              onClick={() => onTrendMetricChange(m)}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const filtered = filterByTimeRange(singleHistory, timeRange);
  const minPoint = getMin(filtered);
  const maxPoint = getMax(filtered);
  const cfg = SINGLE_METRIC_TOOLTIP[trendMetric as Exclude<TrendChartMetric, 'wind'>];

  const chartData = filtered.map((d) => ({
    timestamp: d.timestamp,
    value: Math.round(d.value * 10) / 10,
  }));

  const hasData = filtered.length > 0;
  const values = filtered.map((d) => d.value);
  const yMin = hasData ? Math.floor(Math.min(...values)) - 1 : 0;
  const yMax = hasData ? Math.ceil(Math.max(...values)) + 1 : 1;

  const yTickFormatter =
    trendMetric === 'temperature'
      ? (v: number) => `${v}°`
      : trendMetric === 'pressure'
        ? (v: number) => `${v}`
        : (v: number) => `${v}`;

  return (
    <div className="trend-chart">
      <div className="trend-chart__header">
        <h3 className="trend-chart__title">{sensorLabel}</h3>
        <div className="trend-chart__buttons">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`time-btn ${timeRange === r ? 'time-btn--active' : ''}`}
              onClick={() => onTimeRangeChange(r)}
            >
              {TIME_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="trend-chart__empty">Ingen data for denne målingen</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 11, fill: '#8a7a6a' }}
              tickFormatter={(ts) => formatTrendChartXAxisLabel(String(ts), timeRange)}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#8a7a6a' }}
              tickFormatter={yTickFormatter}
            />
            <Tooltip
              formatter={(val) => {
                if (typeof val !== 'number') return ['—', cfg.name];
                return [cfg.formatter(val), cfg.name];
              }}
              labelFormatter={(ts) => formatTrendChartXAxisLabel(String(ts), timeRange)}
              labelStyle={{ color: '#5a4a3a', fontWeight: 600 }}
              contentStyle={{
                background: '#fff8f0',
                border: '1px solid #d4c4b0',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#5b8fc9"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#5b8fc9' }}
            />
            {maxPoint && (
              <ReferenceDot
                x={maxPoint.timestamp}
                y={Math.round(maxPoint.value * 10) / 10}
                r={5}
                fill="#e05252"
                stroke="white"
                strokeWidth={2}
                label={{ value: 'H', position: 'top', fill: '#e05252', fontSize: 11, fontWeight: 700 }}
              />
            )}
            {minPoint && (
              <ReferenceDot
                x={minPoint.timestamp}
                y={Math.round(minPoint.value * 10) / 10}
                r={5}
                fill="#5b8fc9"
                stroke="white"
                strokeWidth={2}
                label={{ value: 'L', position: 'bottom', fill: '#5b8fc9', fontSize: 11, fontWeight: 700 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="trend-chart__metric-buttons">
        {availableTrendMetrics.map((m) => (
          <button
            key={m}
            type="button"
            className={`time-btn trend-chart__metric-btn ${trendMetric === m ? 'time-btn--active' : ''}`}
            onClick={() => onTrendMetricChange(m)}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
