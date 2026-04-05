import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { DataPoint, TimeRange } from '../types';
import { filterByTimeRange, getMin, getMax } from '../utils';

interface Props {
  history: DataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  sensorLabel: string;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '24h': '24 timer',
  week: 'Siste uke',
  month: 'Siste måned',
};

function formatXAxis(timestamp: string, range: TimeRange): string {
  const date = parseISO(timestamp);
  if (range === '24h') return format(date, 'HH:mm', { locale: nb });
  if (range === 'week') return format(date, 'EEE HH:mm', { locale: nb });
  return format(date, 'd. MMM', { locale: nb });
}

export default function TrendChart({ history, timeRange, onTimeRangeChange, sensorLabel }: Props) {
  const filtered = filterByTimeRange(history, timeRange);
  const minPoint = getMin(filtered);
  const maxPoint = getMax(filtered);

  const chartData = filtered.map((d) => ({
    timestamp: d.timestamp,
    value: Math.round(d.value * 10) / 10,
    label: formatXAxis(d.timestamp, timeRange),
  }));

  const values = filtered.map((d) => d.value);
  const yMin = Math.floor(Math.min(...values)) - 1;
  const yMax = Math.ceil(Math.max(...values)) + 1;

  return (
    <div className="trend-chart">
      <div className="trend-chart__header">
        <h3 className="trend-chart__title">{sensorLabel}</h3>
        <div className="trend-chart__buttons">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              className={`time-btn ${timeRange === r ? 'time-btn--active' : ''}`}
              onClick={() => onTimeRangeChange(r)}
            >
              {TIME_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#8a7a6a' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: '#8a7a6a' }}
            tickFormatter={(v) => `${v}°`}
          />
          <Tooltip
            formatter={(val) => [`${val}°C`, 'Temperatur']}
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
              x={formatXAxis(maxPoint.timestamp, timeRange)}
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
              x={formatXAxis(minPoint.timestamp, timeRange)}
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
    </div>
  );
}
