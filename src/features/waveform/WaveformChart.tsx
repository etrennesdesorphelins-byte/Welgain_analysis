import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { CycleSide } from "../../domain/gaitCycles";
import { exportSvgAsPng } from "../export/pngExport";
import { SIDE_COLOR, SIDE_DASH, SIDE_LABEL } from "./chartConstants";
import type { JointWaveformResult } from "./useWaveforms";

interface WaveformChartProps {
  title: string;
  data: Record<CycleSide, JointWaveformResult>;
  showIndividualCycles: boolean;
  showSd: boolean;
}

const SIDES: CycleSide[] = ["Rt", "Lt"];
const WIDTH = 720;
const HEIGHT = 280;
const MARGIN = { top: 16, right: 16, bottom: 30, left: 46 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

/**
 * 要件定義書12章：0〜100%正規化した股・膝関節角度波形（個別周期・平均±SD）。
 * dataviz skillの仕様：個別周期=薄線、平均=太線、SD帯=塗り10%、右左は色＋線種で区別。
 */
export function WaveformChart({ title, data, showIndividualCycles, showSd }: WaveformChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { minY, maxY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const side of SIDES) {
      for (const cycle of data[side].cycles) {
        for (const v of cycle.points) {
          if (v !== null) {
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        }
      }
      for (const pt of data[side].average) {
        if (pt.mean !== null) {
          const sd = pt.sd ?? 0;
          min = Math.min(min, pt.mean - sd);
          max = Math.max(max, pt.mean + sd);
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
  }, [data]);

  const hasAnyData = SIDES.some((s) => data[s].cycles.length > 0);

  function xForIndex(i: number): number {
    return MARGIN.left + (PLOT_WIDTH * i) / 100;
  }
  function yForValue(v: number): number {
    return MARGIN.top + PLOT_HEIGHT * (1 - (v - minY) / (maxY - minY));
  }

  function pointsToPath(points: (number | null)[]): string {
    const segments: string[] = [];
    let drawing = false;
    points.forEach((v, i) => {
      if (v === null) {
        drawing = false;
        return;
      }
      segments.push(`${drawing ? "L" : "M"}${xForIndex(i).toFixed(1)},${yForValue(v).toFixed(1)}`);
      drawing = true;
    });
    return segments.join(" ");
  }

  function sdBandPath(side: CycleSide): string {
    const avg = data[side].average;
    const upper: string[] = [];
    const lower: string[] = [];
    avg.forEach((pt, i) => {
      if (pt.mean === null || pt.sd === null) return;
      upper.push(`${xForIndex(i).toFixed(1)},${yForValue(pt.mean + pt.sd).toFixed(1)}`);
      lower.unshift(`${xForIndex(i).toFixed(1)},${yForValue(pt.mean - pt.sd).toFixed(1)}`);
    });
    if (upper.length === 0) return "";
    return `M${upper.join(" L")} L${lower.join(" L")} Z`;
  }

  function handlePointerMove(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * 100));
  }

  const yTicks = [minY, (minY + maxY) / 2, maxY];

  return (
    <div className="waveform-chart">
      <h5>{title}</h5>
      {!hasAnyData ? (
        <p className="waveform-chart__empty">同側ICが2件以上ないため波形を表示できません。</p>
      ) : (
        <>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${title}の関節角度波形（0〜100%正規化、右左比較）`}
          >
            {[0, 25, 50, 75, 100].map((g) => (
              <line
                key={g}
                x1={xForIndex(g)}
                y1={MARGIN.top}
                x2={xForIndex(g)}
                y2={MARGIN.top + PLOT_HEIGHT}
                stroke="#e1e0d9"
                strokeWidth={1}
              />
            ))}
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
                  {v.toFixed(0)}°
                </text>
              </g>
            ))}
            {[0, 50, 100].map((g) => (
              <text key={g} x={xForIndex(g)} y={HEIGHT - 8} fontSize={10} fill="#898781" textAnchor="middle">
                {g}%
              </text>
            ))}
            <line
              x1={MARGIN.left}
              y1={MARGIN.top + PLOT_HEIGHT}
              x2={MARGIN.left + PLOT_WIDTH}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke="#c3c2b7"
              strokeWidth={1}
            />

            {SIDES.map((side) => (
              <g key={side}>
                {showSd && <path d={sdBandPath(side)} fill={SIDE_COLOR[side]} opacity={0.1} stroke="none" />}
                {showIndividualCycles &&
                  data[side].cycles.map((cycle, idx) => (
                    <path
                      key={idx}
                      d={pointsToPath(cycle.points)}
                      fill="none"
                      stroke={SIDE_COLOR[side]}
                      strokeWidth={1}
                      opacity={0.35}
                      strokeDasharray={SIDE_DASH[side]}
                    />
                  ))}
                <path
                  d={pointsToPath(data[side].average.map((p) => p.mean))}
                  fill="none"
                  stroke={SIDE_COLOR[side]}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={SIDE_DASH[side]}
                />
              </g>
            ))}

            {hoverIndex !== null && (
              <line
                x1={xForIndex(hoverIndex)}
                y1={MARGIN.top}
                x2={xForIndex(hoverIndex)}
                y2={MARGIN.top + PLOT_HEIGHT}
                stroke="#52514e"
                strokeWidth={1}
              />
            )}

            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>

          <div className="waveform-chart__legend">
            {SIDES.map((side) => (
              <span key={side} className="waveform-chart__legend-item">
                <svg width={20} height={10} aria-hidden="true">
                  <line
                    x1={0}
                    y1={5}
                    x2={20}
                    y2={5}
                    stroke={SIDE_COLOR[side]}
                    strokeWidth={2.5}
                    strokeDasharray={SIDE_DASH[side]}
                  />
                </svg>
                {SIDE_LABEL[side]}（{data[side].cycles.length}周期）
              </span>
            ))}
            <button
              type="button"
              className="waveform-chart__png-button"
              onClick={() => {
                if (svgRef.current) void exportSvgAsPng(svgRef.current, `${title}.png`);
              }}
            >
              PNG保存
            </button>
          </div>

          {hoverIndex !== null && (
            <div className="waveform-chart__tooltip">
              <strong>{hoverIndex}%</strong>
              {SIDES.map((side) => {
                const pt = data[side].average[hoverIndex];
                const mean = pt?.mean ?? null;
                const sd = pt?.sd ?? null;
                return (
                  <span key={side} className="waveform-chart__tooltip-row">
                    <svg width={14} height={10} aria-hidden="true">
                      <line x1={0} y1={5} x2={14} y2={5} stroke={SIDE_COLOR[side]} strokeWidth={2.5} strokeDasharray={SIDE_DASH[side]} />
                    </svg>
                    {SIDE_LABEL[side]}: {mean !== null ? `${mean.toFixed(1)}°` : "—"}
                    {sd !== null ? `（±${sd.toFixed(1)}）` : ""}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
