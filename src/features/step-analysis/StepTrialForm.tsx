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

/** 要件定義書14.1：ステップ側・動作開始・ステップ側IC・動作終了（任意）の登録フォーム。 */
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
          ステップ側ICを記録
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
        <button type="button" disabled={disabled || !state.canCommitDraft} onClick={state.commitDraft}>
          この試行を追加
        </button>
        {!state.canCommitDraft && (
          <span className="step-trial-form__hint">動作開始とステップ側ICの記録が必要です。</span>
        )}
      </div>
    </div>
  );
}
