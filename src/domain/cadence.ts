import type { GaitEvent } from "./events";

export interface CadenceResult {
  method: string;
  stepCount: number;
  durationSec: number;
  cadenceStepsPerMin: number | null;
}

/**
 * 要件定義書11.3：連続する左右IC間隔（解析区間内の歩数と時間）からケイデンスを算出する。
 * 歩数 = IC総数、区間 = 最初のICから最後のICまでの時間。
 */
export function computeCadence(events: GaitEvent[]): CadenceResult {
  const icEvents = events
    .filter((e) => e.type === "Rt_IC" || e.type === "Lt_IC")
    .sort((a, b) => a.videoTimeSec - b.videoTimeSec);

  const method = "解析区間内のIC総数と経過時間から算出：(IC数-1) ÷ (最終IC時刻-最初のIC時刻) × 60";

  if (icEvents.length < 2) {
    return { method, stepCount: icEvents.length, durationSec: 0, cadenceStepsPerMin: null };
  }

  const durationSec = icEvents[icEvents.length - 1].videoTimeSec - icEvents[0].videoTimeSec;
  const stepsInInterval = icEvents.length - 1;
  const cadenceStepsPerMin = durationSec > 0 ? (stepsInInterval / durationSec) * 60 : null;

  return { method, stepCount: icEvents.length, durationSec, cadenceStepsPerMin };
}
