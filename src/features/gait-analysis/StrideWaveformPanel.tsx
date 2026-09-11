import type { GaitEvent } from "../../domain/events";
import { RawWaveformChart } from "../waveform/RawWaveformChart";
import { SIDE_COLOR, SIDE_DASH } from "../waveform/chartConstants";
import type { StrideWaveformState } from "./useStrideWaveform";

interface StrideWaveformPanelProps {
  state: StrideWaveformState;
  events: GaitEvent[];
}

/** 歩幅（formulas.md第6章）をCSV全体の時間軸で連続表示する。 */
export function StrideWaveformPanel({ state, events }: StrideWaveformPanelProps) {
  if (state.isConfigIncomplete) {
    return (
      <p className="waveform-panel__empty">
        歩幅波形を表示するには、CSV列割当（大腿・下腿・骨盤角度、時刻）と身体計測値をすべて入力してください。
      </p>
    );
  }

  return (
    <RawWaveformChart
      title="歩幅"
      csvTimes={state.csvTimes}
      unit="cm"
      events={events}
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
  );
}
