import type { GaitEvent } from "../../domain/events";
import { RawWaveformChart } from "../waveform/RawWaveformChart";
import { SIDE_COLOR, SIDE_DASH } from "../waveform/chartConstants";
import type { StrideWaveformState } from "./useStrideWaveform";
import type { StrideRangeSelection, StrideRangeResultsState } from "./useStrideRangeResults";

interface StrideWaveformPanelProps {
  state: StrideWaveformState;
  events: GaitEvent[];
  selection: StrideRangeSelection | null;
  onSelectionChange: (range: StrideRangeSelection | null) => void;
  strideResults: StrideRangeResultsState;
  minPeakProminenceCmOverride: number | null;
  onMinPeakProminenceCmOverrideChange: (value: number | null) => void;
}

/** 歩幅（formulas.md第6章）をCSV全体の時間軸で連続表示し、範囲選択によりステップ歩幅を自動検出する。 */
export function StrideWaveformPanel({
  state,
  events,
  selection,
  onSelectionChange,
  strideResults,
  minPeakProminenceCmOverride,
  onMinPeakProminenceCmOverrideChange,
}: StrideWaveformPanelProps) {
  if (state.isConfigIncomplete) {
    return (
      <p className="waveform-panel__empty">
        歩幅波形を表示するには、CSV列割当（大腿・下腿・骨盤角度、時刻）と身体計測値をすべて入力してください。
      </p>
    );
  }

  return (
    <div className="stride-waveform-panel">
      <p className="stride-waveform-panel__hint">
        波形をドラッグして範囲を選択すると、その範囲内の極大・極小点をステップ歩幅として自動検出します。
        山や谷の途中に余分な検出点が出る場合は、下の検出感度を上げてください。
      </p>
      <div className="stride-waveform-panel__selection">
        {selection ? (
          <>
            <span>
              選択範囲: {selection.startSec.toFixed(2)}秒 〜 {selection.endSec.toFixed(2)}秒（検出
              {strideResults.results.length}件）
            </span>
            <button type="button" onClick={() => onSelectionChange(null)}>
              選択解除
            </button>
          </>
        ) : (
          <span>範囲が未選択です。</span>
        )}
      </div>
      {selection && strideResults.effectiveMinPeakProminenceCm !== null && (
        <div className="stride-waveform-panel__sensitivity">
          <label>
            検出感度（最小振幅, cm）
            <input
              type="number"
              min={0}
              step={0.5}
              value={strideResults.effectiveMinPeakProminenceCm.toFixed(1)}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                onMinPeakProminenceCmOverrideChange(Number.isFinite(value) ? value : null);
              }}
            />
          </label>
          {minPeakProminenceCmOverride !== null && (
            <button type="button" onClick={() => onMinPeakProminenceCmOverrideChange(null)}>
              既定値に戻す（{strideResults.suggestedMinPeakProminenceCm?.toFixed(1)}）
            </button>
          )}
        </div>
      )}
      <RawWaveformChart
        title="歩幅"
        csvTimes={state.csvTimes}
        unit="cm"
        markers={events.map((e) => ({
          id: e.id,
          csvTimeSec: e.csvTimeSec,
          side: e.type.startsWith("Rt") ? "Rt" : "Lt",
          shape: e.type.endsWith("Off") ? "square" : "circle",
        }))}
        markerLegend={[
          { shape: "circle", label: "IC（接地）" },
          { shape: "square", label: "Off（離地）" },
        ]}
        selection={selection}
        onSelectionChange={onSelectionChange}
        peakMarkers={strideResults.results.map((r) => ({
          csvTimeSec: r.csvTimeSec,
          value: r.signedStride,
          side: r.side,
        }))}
        series={[
          {
            key: "raw",
            label: "骨盤補正なし",
            color: SIDE_COLOR.Rt,
            dash: SIDE_DASH.Rt,
            values: state.rawStride,
          },
          {
            key: "corrected",
            label: "骨盤補正あり",
            color: SIDE_COLOR.Lt,
            dash: SIDE_DASH.Lt,
            values: state.pelvisCorrectedStride,
          },
        ]}
      />
    </div>
  );
}
