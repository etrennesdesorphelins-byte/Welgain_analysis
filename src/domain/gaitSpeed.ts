export interface GaitSpeedInput {
  measuredDistanceM: number | null;
  startTimeSec: number | null;
  endTimeSec: number | null;
}

export interface GaitSpeedResult {
  speedMPerSec: number | null;
  durationSec: number | null;
}

/**
 * 要件定義書13章：歩行速度 = 測定距離 ÷ (終了時刻 − 開始時刻)。
 * 測定距離または時刻が未入力、あるいは終了が開始以前の場合は算出しない。
 */
export function computeGaitSpeed(input: GaitSpeedInput): GaitSpeedResult {
  const { measuredDistanceM, startTimeSec, endTimeSec } = input;
  if (measuredDistanceM === null || startTimeSec === null || endTimeSec === null) {
    return { speedMPerSec: null, durationSec: null };
  }
  const durationSec = endTimeSec - startTimeSec;
  if (durationSec <= 0) {
    return { speedMPerSec: null, durationSec: null };
  }
  return { speedMPerSec: measuredDistanceM / durationSec, durationSec };
}
