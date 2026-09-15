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
  playheadCsvTimeSec: number | null;
  baselineSelection: StepBaselineSelection | null;
  onBaselineSelectionChange: (range: StepBaselineSelection | null) => void;
  onAutoDetect: () => void;
  autoDetectMessage: string | null;
}

/**
 * ステップ動作開始・ステップ幅最大値を視覚的に確認するための歩幅波形表示。
 * 静止立位区間をドラッグで選択し、自動検出（平均値±2SD超えを動作開始、
 * その後の区間内の真の最大値をステップ幅最大値とする）した結果を、登録済み
 * 試行・現在の入力中の試行とあわせてマーカー表示する。動画の再生位置も
 * バーで表示し、動画と波形の対応が視覚的にわかるようにする。
 */
export function StepWaveformPanel({
  state,
  trials,
  draft,
  toCsvTime,
  playheadCsvTimeSec,
  baselineSelection,
  onBaselineSelectionChange,
  onAutoDetect,
  autoDetectMessage,
}: StepWaveformPanelProps) {
  if (state.isConfigIncomplete) {
    return (
      <p className="waveform-panel__empty">
        歩幅波形を表示するには、CSV列割当と大腿長・下腿長を入力してください。
        未入力の項目: {state.missingFields.join("、")}
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
        波形をドラッグして静止立位区間を選択し、「自動検出」で動作開始・ステップ幅最大値を推定できます。
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
          動作開始・ステップ幅最大値を自動検出
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
          { shape: "circle", label: "ステップ幅最大値" },
        ]}
        selection={baselineSelection}
        onSelectionChange={onBaselineSelectionChange}
        playheadCsvTimeSec={playheadCsvTimeSec}
        series={series}
      />
    </div>
  );
}
