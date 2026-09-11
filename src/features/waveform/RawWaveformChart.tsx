import { useMemo } from "react";
import type { CycleSide } from "../../domain/gaitCycles";
import { SIDE_COLOR, SIDE_DASH, SIDE_LABEL } from "./chartConstants";

interface RawWaveformChartProps {
  title: string;
  csvTimes: number[];
  values: Record<CycleSide, number[]>;
}

const SIDES: CycleSide[] = ["Rt", "Lt"];
const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 46 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

/** 要件定義書12章：「元時間波形」（正規化前、CSV全体の時間軸そのまま）の表示。 */
export function RawWaveformChart({ title, csvTimes, values }: RawWaveformChartProps) {
  const maxTime = csvTimes.length > 0 ? csvTimes[csvTimes.length - 1] : 1;

  const { minY, maxY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const side of SIDES) {
      for (const v of values[side]) {
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
  }, [values]);

  function xForTime(t: number): number {
    return MARGIN.left + (maxTime > 0 ? (PLOT_WIDTH * t) / maxTime : 0);
  }
  function yForValue(v: number): number {
    return MARGIN.top + PLOT_HEIGHT * (1 - (v - minY) / (maxY - minY));
  }

  function pathFor(side: CycleSide): string {
    const segments: string[] = [];
    let drawing = false;
    values[side].forEach((v, i) => {
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

  return (
    <div className="waveform-chart">
      <h5>{title}（元時間波形）</h5>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}の元時間波形`}>
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
        {SIDES.map((side) => (
          <path
            key={side}
            d={pathFor(side)}
            fill="none"
            stroke={SIDE_COLOR[side]}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={SIDE_DASH[side]}
          />
        ))}
      </svg>
      <div className="waveform-chart__legend">
        {SIDES.map((side) => (
          <span key={side} className="waveform-chart__legend-item">
            <svg width={20} height={10} aria-hidden="true">
              <line x1={0} y1={5} x2={20} y2={5} stroke={SIDE_COLOR[side]} strokeWidth={2} strokeDasharray={SIDE_DASH[side]} />
            </svg>
            {SIDE_LABEL[side]}
          </span>
        ))}
      </div>
    </div>
  );
}
