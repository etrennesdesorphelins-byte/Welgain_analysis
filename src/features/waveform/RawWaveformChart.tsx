import { useMemo, useState, type PointerEvent } from "react";
import type { CycleSide } from "../../domain/gaitCycles";
import { SIDE_COLOR } from "./chartConstants";

export interface RawWaveformSeries {
  key: string;
  label: string;
  color: string;
  dash?: string;
  values: number[];
}

export interface RawWaveformRange {
  startSec: number;
  endSec: number;
}

export interface RawWaveformPeakMarker {
  csvTimeSec: number;
  value: number;
  side: CycleSide;
}

export type RawWaveformMarkerShape = "circle" | "square";

export interface RawWaveformMarker {
  id: string;
  csvTimeSec: number;
  side: CycleSide;
  shape: RawWaveformMarkerShape;
}

export interface RawWaveformMarkerLegendItem {
  shape: RawWaveformMarkerShape;
  label: string;
}

interface RawWaveformChartProps {
  title: string;
  csvTimes: number[];
  series: RawWaveformSeries[];
  /** Y軸の単位表示（例："cm"、"°"）。省略時は数値のみ表示する。 */
  unit?: string;
  /** タグ付けしたイベント（歩行イベント・ステップ動作イベント等）を時間軸上に表示する（省略時は非表示）。 */
  markers?: RawWaveformMarker[];
  /** markers の凡例（形状と意味の対応）。markersを指定する場合はあわせて指定する。 */
  markerLegend?: RawWaveformMarkerLegendItem[];
  /** ドラッグで選択した時間範囲（範囲選択機能を使わない場合は省略）。 */
  selection?: RawWaveformRange | null;
  /** 指定するとドラッグによる範囲選択を有効化する。 */
  onSelectionChange?: (range: RawWaveformRange | null) => void;
  /** 波形上に表示する、自動検出したピーク（歩幅のステップ等）。 */
  peakMarkers?: RawWaveformPeakMarker[];
}

const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 20, right: 16, bottom: 28, left: 46 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const EVENT_MARKER_SIZE = 7;

/** 要件定義書12章：「元時間波形」（正規化前、CSV全体の時間軸そのまま）の表示。系列数は可変。 */
export function RawWaveformChart({
  title,
  csvTimes,
  series,
  unit,
  markers,
  markerLegend,
  selection,
  onSelectionChange,
  peakMarkers,
}: RawWaveformChartProps) {
  const [dragStartSec, setDragStartSec] = useState<number | null>(null);
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
  function timeForClientX(clientX: number, rect: DOMRect): number {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * maxTime;
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

  function handlePointerDown(e: PointerEvent<SVGRectElement>) {
    if (!onSelectionChange) return;
    const t = timeForClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    setDragStartSec(t);
    onSelectionChange({ startSec: t, endSec: t });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: PointerEvent<SVGRectElement>) {
    if (dragStartSec === null || !onSelectionChange) return;
    const t = timeForClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    onSelectionChange({ startSec: Math.min(dragStartSec, t), endSec: Math.max(dragStartSec, t) });
  }
  function handlePointerUp() {
    setDragStartSec(null);
  }

  if (csvTimes.length === 0) {
    return <p className="waveform-chart__empty">CSVが読み込まれていません。</p>;
  }

  const yTicks = [minY, (minY + maxY) / 2, maxY];
  const visibleMarkers = (markers ?? []).filter((m) => m.csvTimeSec >= 0 && m.csvTimeSec <= maxTime);
  const visiblePeaks = (peakMarkers ?? []).filter(
    (p) => Number.isFinite(p.value) && p.csvTimeSec >= 0 && p.csvTimeSec <= maxTime,
  );

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

        {selection && (
          <rect
            x={xForTime(selection.startSec)}
            y={MARGIN.top}
            width={Math.max(0, xForTime(selection.endSec) - xForTime(selection.startSec))}
            height={PLOT_HEIGHT}
            fill="#52514e"
            fillOpacity={0.08}
            stroke="#52514e"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        )}

        {visibleMarkers.map((marker) => {
          const x = xForTime(marker.csvTimeSec);
          return (
            <line
              key={marker.id}
              x1={x}
              y1={MARGIN.top}
              x2={x}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke={SIDE_COLOR[marker.side]}
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

        {visibleMarkers.map((marker) => {
          const x = xForTime(marker.csvTimeSec);
          const cy = MARGIN.top - EVENT_MARKER_SIZE / 2 - 1;
          const color = SIDE_COLOR[marker.side];
          return (
            <g key={marker.id}>
              {marker.shape === "square" ? (
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

        {visiblePeaks.map((p, i) => (
          <circle
            key={`${p.csvTimeSec}-${i}`}
            cx={xForTime(p.csvTimeSec)}
            cy={yForValue(p.value)}
            r={4.5}
            fill={SIDE_COLOR[p.side]}
            stroke="#fcfcfb"
            strokeWidth={1.5}
          />
        ))}

        {onSelectionChange && (
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill="transparent"
            style={{ cursor: "crosshair" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}
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
        {visibleMarkers.length > 0 &&
          (markerLegend ?? []).map((item) => (
            <span key={item.label} className="waveform-chart__legend-item">
              <svg width={12} height={12} aria-hidden="true">
                {item.shape === "square" ? (
                  <rect x={2.5} y={2.5} width={7} height={7} fill="#6b6a63" />
                ) : (
                  <circle cx={6} cy={6} r={3.5} fill="#6b6a63" />
                )}
              </svg>
              {item.label}
            </span>
          ))}
        {visiblePeaks.length > 0 && (
          <span className="waveform-chart__legend-item">
            <svg width={12} height={12} aria-hidden="true">
              <circle cx={6} cy={6} r={4} fill="#6b6a63" stroke="#fcfcfb" strokeWidth={1} />
            </svg>
            検出ステップ
          </span>
        )}
      </div>
    </div>
  );
}
