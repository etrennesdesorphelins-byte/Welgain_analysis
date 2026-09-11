import { useMemo } from "react";
import type { GaitEvent } from "../../domain/events";
import { SIDE_COLOR } from "./chartConstants";

export interface RawWaveformSeries {
  key: string;
  label: string;
  color: string;
  dash?: string;
  values: number[];
}

interface RawWaveformChartProps {
  title: string;
  csvTimes: number[];
  series: RawWaveformSeries[];
  /** Y軸の単位表示（例："cm"、"°"）。省略時は数値のみ表示する。 */
  unit?: string;
  /** タグ付けした歩行イベントを時間軸上に表示する（省略時は非表示）。 */
  events?: GaitEvent[];
}

const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 20, right: 16, bottom: 28, left: 46 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const EVENT_MARKER_SIZE = 7;

/** 要件定義書12章：「元時間波形」（正規化前、CSV全体の時間軸そのまま）の表示。系列数は可変。 */
export function RawWaveformChart({ title, csvTimes, series, unit, events }: RawWaveformChartProps) {
  const maxTime = csvTimes.length > 0 ? csvTimes[csvTimes.length - 1] : 1;

  const { minY, maxY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
        if (Number.isFinite(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return { minY: -10, maxY: 10 };
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.1;
    return { minY: min - pad, maxY: max + pad };
  }, [series]);

  function xForTime(t: number): number {
    return MARGIN.left + (maxTime > 0 ? (PLOT_WIDTH * t) / maxTime : 0);
  }
  function yForValue(v: number): number {
    return MARGIN.top + PLOT_HEIGHT * (1 - (v - minY) / (maxY - minY));
  }

  function pathFor(values: number[]): string {
    const segments: string[] = [];
    let drawing = false;
    values.forEach((v, i) => {
      const t = csvTimes[i];
      if (!Number.isFinite(v) || !Number.isFinite(t)) {
        drawing = false;
        return;
      }
      segments.push(`${drawing ? "L" : "M"}${xForTime(t).toFixed(1)},${yForValue(v).toFixed(1)}`);
      drawing = true;
    });
    return segments.join(" ");
  }

  if (csvTimes.length === 0) {
    return <p className="waveform-chart__empty">CSVが読み込まれていません。</p>;
  }

  const yTicks = [minY, (minY + maxY) / 2, maxY];
  const visibleEvents = (events ?? []).filter((e) => e.csvTimeSec >= 0 && e.csvTimeSec <= maxTime);

  return (
    <div className="waveform-chart">
      <h5>{title}（元時間波形）</h5>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}の元時間波形`}>
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={MARGIN.left}
              y1={yForValue(v)}
              x2={MARGIN.left + PLOT_WIDTH}
              y2={yForValue(v)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 6} y={yForValue(v) + 3} fontSize={10} fill="#898781" textAnchor="end">
              {v.toFixed(1)}
              {unit ?? ""}
            </text>
          </g>
        ))}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + PLOT_HEIGHT}
          x2={MARGIN.left + PLOT_WIDTH}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="#c3c2b7"
          strokeWidth={1}
        />
        <text x={MARGIN.left} y={HEIGHT - 6} fontSize={10} fill="#898781" textAnchor="start">
          0秒
        </text>
        <text x={MARGIN.left + PLOT_WIDTH} y={HEIGHT - 6} fontSize={10} fill="#898781" textAnchor="end">
          {maxTime.toFixed(1)}秒
        </text>

        {visibleEvents.map((event) => {
          const side = event.type.startsWith("Rt") ? "Rt" : "Lt";
          const x = xForTime(event.csvTimeSec);
          return (
            <line
              key={event.id}
              x1={x}
              y1={MARGIN.top}
              x2={x}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke={SIDE_COLOR[side]}
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          );
        })}

        {series.map((s) => (
          <path
            key={s.key}
            d={pathFor(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dash}
          />
        ))}

        {visibleEvents.map((event) => {
          const side = event.type.startsWith("Rt") ? "Rt" : "Lt";
          const isOff = event.type.endsWith("Off");
          const x = xForTime(event.csvTimeSec);
          const cy = MARGIN.top - EVENT_MARKER_SIZE / 2 - 1;
          const color = SIDE_COLOR[side];
          return (
            <g key={event.id}>
              {isOff ? (
                <rect
                  x={x - EVENT_MARKER_SIZE / 2}
                  y={cy - EVENT_MARKER_SIZE / 2}
                  width={EVENT_MARKER_SIZE}
                  height={EVENT_MARKER_SIZE}
                  fill={color}
                  stroke="#fcfcfb"
                  strokeWidth={0.75}
                />
              ) : (
                <circle cx={x} cy={cy} r={EVENT_MARKER_SIZE / 2} fill={color} stroke="#fcfcfb" strokeWidth={0.75} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="waveform-chart__legend">
        {series.map((s) => (
          <span key={s.key} className="waveform-chart__legend-item">
            <svg width={20} height={10} aria-hidden="true">
              <line x1={0} y1={5} x2={20} y2={5} stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />
            </svg>
            {s.label}
          </span>
        ))}
        {visibleEvents.length > 0 && (
          <>
            <span className="waveform-chart__legend-item">
              <svg width={12} height={12} aria-hidden="true">
                <circle cx={6} cy={6} r={3.5} fill="#6b6a63" />
              </svg>
              IC（接地）
            </span>
            <span className="waveform-chart__legend-item">
              <svg width={12} height={12} aria-hidden="true">
                <rect x={2.5} y={2.5} width={7} height={7} fill="#6b6a63" />
              </svg>
              Off（離地）
            </span>
          </>
        )}
      </div>
    </div>
  );
}
