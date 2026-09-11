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
}

/** 歩幅（formulas.md第6章）をCSV全体の時間軸で連続表示し、範囲選択によりステップ歩幅を自動検出する。 */
export function StrideWaveformPanel({
  state,
  events,
  selection,
  onSelectionChange,
  strideResults,
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
      <RawWaveformChart
        title="歩幅"
        csvTimes={state.csvTimes}
        unit="cm"
        events={events}
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
