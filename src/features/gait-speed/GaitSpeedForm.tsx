import type { ChangeEvent } from "react";
import type { GaitSpeedState } from "./useGaitSpeed";

function parseNumberOrNull(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

interface GaitSpeedFormProps {
  state: GaitSpeedState;
  currentVideoTimeSec: number;
  disabled: boolean;
}

/** 要件定義書13章：測定距離と開始・終了時刻（動画上で登録または数値入力）から歩行速度を算出する。 */
export function GaitSpeedForm({ state, currentVideoTimeSec, disabled }: GaitSpeedFormProps) {
  return (
    <div className="gait-speed-form">
      <div className="gait-speed-form__row">
        <label>
          測定距離 (m)
          <input
            type="number"
            min={0}
            step="0.1"
            value={state.measuredDistanceM ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              state.setMeasuredDistanceM(parseNumberOrNull(e.target.value))
            }
          />
        </label>
      </div>
      <div className="gait-speed-form__row">
        <label>
          開始時刻 (秒)
          <input
            type="number"
            step="0.001"
            value={state.startTimeSec ?? ""}
            onChange={(e) => state.setStartTimeSec(parseNumberOrNull(e.target.value))}
          />
        </label>
        <button type="button" disabled={disabled} onClick={() => state.captureStart(currentVideoTimeSec)}>
          現在時刻を記録
        </button>
      </div>
      <div className="gait-speed-form__row">
        <label>
          終了時刻 (秒)
          <input
            type="number"
            step="0.001"
            value={state.endTimeSec ?? ""}
            onChange={(e) => state.setEndTimeSec(parseNumberOrNull(e.target.value))}
          />
        </label>
        <button type="button" disabled={disabled} onClick={() => state.captureEnd(currentVideoTimeSec)}>
          現在時刻を記録
        </button>
      </div>
      <p className="gait-speed-form__result">
        歩行速度：
        {state.result.speedMPerSec !== null ? `${state.result.speedMPerSec.toFixed(3)} m/s` : "算出には測定距離・開始・終了時刻がすべて必要です"}
      </p>
    </div>
  );
}
