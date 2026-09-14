import type { StepSide } from "../../domain/stepTrial";
import type { StepTrialsState } from "./useStepTrials";

function fmt(v: number | null): string {
  return v === null ? "未登録" : `${v.toFixed(2)}秒`;
}

interface StepTrialFormProps {
  state: StepTrialsState;
  currentVideoTimeSec: number;
  disabled: boolean;
}

/**
 * 要件定義書14.1：ステップ側・動作開始・ステップ幅最大値・動作終了（任意）の登録フォーム。
 * 遊脚時間算出用に、足部離床・足部IC（いずれも任意）も動画から直接記録できる。
 */
export function StepTrialForm({ state, currentVideoTimeSec, disabled }: StepTrialFormProps) {
  return (
    <div className="step-trial-form">
      <div className="step-trial-form__row">
        <label>
          ステップ側
          <select
            value={state.draft.side}
            onChange={(e) => state.setDraftSide(e.target.value as StepSide)}
            disabled={disabled}
          >
            <option value="Rt">右</option>
            <option value="Lt">左</option>
          </select>
        </label>
        <button type="button" disabled={disabled} onClick={() => state.captureMovementStart(currentVideoTimeSec)}>
          動作開始を記録
        </button>
        <span>{fmt(state.draft.movementStartVideoTimeSec)}</span>
      </div>
      <div className="step-trial-form__row">
        <button type="button" disabled={disabled} onClick={() => state.captureIc(currentVideoTimeSec)}>
          ステップ幅最大値を記録
        </button>
        <span>{fmt(state.draft.icVideoTimeSec)}</span>
      </div>
      <div className="step-trial-form__row">
        <button type="button" disabled={disabled} onClick={() => state.captureMovementEnd(currentVideoTimeSec)}>
          動作終了を記録（任意）
        </button>
        <span>{fmt(state.draft.movementEndVideoTimeSec)}</span>
        {state.draft.movementEndVideoTimeSec !== null && (
          <button type="button" onClick={state.clearMovementEnd}>
            取消
          </button>
        )}
      </div>
      <div className="step-trial-form__row">
        <button type="button" disabled={disabled} onClick={() => state.captureFootOff(currentVideoTimeSec)}>
          足部離床を記録（任意・遊脚時間算出用）
        </button>
        <span>{fmt(state.draft.footOffVideoTimeSec)}</span>
        {state.draft.footOffVideoTimeSec !== null && (
          <button type="button" onClick={state.clearFootOff}>
            取消
          </button>
        )}
      </div>
      <div className="step-trial-form__row">
        <button type="button" disabled={disabled} onClick={() => state.captureFootIc(currentVideoTimeSec)}>
          足部ICを記録（任意・遊脚時間算出用）
        </button>
        <span>{fmt(state.draft.footIcVideoTimeSec)}</span>
        {state.draft.footIcVideoTimeSec !== null && (
          <button type="button" onClick={state.clearFootIc}>
            取消
          </button>
        )}
      </div>
      <div className="step-trial-form__row">
        <button type="button" disabled={disabled || !state.canCommitDraft} onClick={state.commitDraft}>
          この試行を追加
        </button>
        {!state.canCommitDraft && (
          <span className="step-trial-form__hint">動作開始とステップ幅最大値の記録が必要です。</span>
        )}
      </div>
    </div>
  );
}
