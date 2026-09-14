import type { StepTrial } from "../../domain/stepTrial";
import { RawWaveformChart, type RawWaveformMarker } from "../waveform/RawWaveformChart";
import { SIDE_COLOR, SIDE_DASH } from "../waveform/chartConstants";
import type { StepWaveformState } from "./useStepWaveform";
import type { StepTrialDraft } from "./useStepTrials";

export interface StepBaselineSelection {
  startSec: number;
  endSec: number;
}

interface StepWaveformPanelProps {
  state: StepWaveformState;
  trials: StepTrial[];
  draft: StepTrialDraft;
  toCsvTime: (videoTimeSec: number) => number;
  baselineSelection: StepBaselineSelection | null;
  onBaselineSelectionChange: (range: StepBaselineSelection | null) => void;
  onAutoDetect: () => void;
  autoDetectMessage: string | null;
}

/**
 * ステップ動作開始・ステップ側ICを視覚的に確認するための歩幅波形表示。
 * 静止立位区間をドラッグで選択し、自動検出（平均値±2SD超えを動作開始、
 * その後の極値をステップ側ICとする）した結果を、登録済み試行・現在の
 * 入力中の試行とあわせてマーカー表示する。
 */
export function StepWaveformPanel({
  state,
  trials,
  draft,
  toCsvTime,
  baselineSelection,
  onBaselineSelectionChange,
  onAutoDetect,
  autoDetectMessage,
}: StepWaveformPanelProps) {
  if (state.isConfigIncomplete) {
    return (
      <p className="waveform-panel__empty">
        歩幅波形を表示するには、CSV列割当（大腿・下腿角度、時刻）と大腿長・下腿長を入力してください。
      </p>
    );
  }

  const markers: RawWaveformMarker[] = [];
  trials.forEach((t) => {
    markers.push({ id: `${t.id}-start`, csvTimeSec: t.movementStartCsvTimeSec, side: t.side, shape: "square" });
    markers.push({ id: `${t.id}-ic`, csvTimeSec: t.icCsvTimeSec, side: t.side, shape: "circle" });
  });
  if (draft.movementStartVideoTimeSec !== null) {
    markers.push({
      id: "draft-start",
      csvTimeSec: toCsvTime(draft.movementStartVideoTimeSec),
      side: draft.side,
      shape: "square",
    });
  }
  if (draft.icVideoTimeSec !== null) {
    markers.push({
      id: "draft-ic",
      csvTimeSec: toCsvTime(draft.icVideoTimeSec),
      side: draft.side,
      shape: "circle",
    });
  }

  const series = [
    {
      key: "raw",
      label: "骨盤補正なし",
      color: SIDE_COLOR.Rt,
      dash: SIDE_DASH.Rt,
      values: state.rawStride,
    },
    ...(state.pelvisCorrectedStride
      ? [
          {
            key: "corrected",
            label: "骨盤補正あり",
            color: SIDE_COLOR.Lt,
            dash: SIDE_DASH.Lt,
            values: state.pelvisCorrectedStride,
          },
        ]
      : []),
  ];

  return (
    <div className="stride-waveform-panel">
      <p className="stride-waveform-panel__hint">
        波形をドラッグして静止立位区間を選択し、「自動検出」で動作開始・ステップ側ICを推定できます。
        自動検出後も、動画側の登録ボタンで現在の再生位置に上書きして修正できます。
      </p>
      <div className="stride-waveform-panel__selection">
        {baselineSelection ? (
          <>
            <span>
              静止立位区間: {baselineSelection.startSec.toFixed(2)}秒 〜 {baselineSelection.endSec.toFixed(2)}秒
            </span>
            <button type="button" onClick={() => onBaselineSelectionChange(null)}>
              選択解除
            </button>
          </>
        ) : (
          <span>静止立位区間が未選択です。</span>
        )}
        <button type="button" disabled={!baselineSelection} onClick={onAutoDetect}>
          動作開始・ステップ側ICを自動検出
        </button>
      </div>
      {autoDetectMessage && <p className="step-trial-form__hint">{autoDetectMessage}</p>}
      <RawWaveformChart
        title="歩幅"
        csvTimes={state.csvTimes}
        unit="cm"
        markers={markers}
        markerLegend={[
          { shape: "square", label: "動作開始" },
          { shape: "circle", label: "ステップ側IC" },
        ]}
        selection={baselineSelection}
        onSelectionChange={onBaselineSelectionChange}
        series={series}
      />
    </div>
  );
}
