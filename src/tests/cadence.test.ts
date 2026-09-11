import { describe, expect, it } from "vitest";
import { computeCadence } from "../domain/cadence";
import type { GaitEvent } from "../domain/events";

function makeEvent(type: GaitEvent["type"], videoTimeSec: number): GaitEvent {
  return { id: `${type}-${videoTimeSec}`, type, videoTimeSec, estimatedFrame: null, csvTimeSec: videoTimeSec };
}

describe("computeCadence", () => {
  it("IC総数と経過時間からケイデンスを算出する", () => {
    const events = [
      makeEvent("Rt_IC", 0),
      makeEvent("Lt_IC", 0.6),
      makeEvent("Rt_IC", 1.2),
      makeEvent("Lt_IC", 1.8),
    ];
    const result = computeCadence(events);
    expect(result.stepCount).toBe(4);
    expect(result.durationSec).toBeCloseTo(1.8, 6);
    expect(result.cadenceStepsPerMin).toBeCloseTo(100, 6);
  });

  it("Off種類のイベントは歩数に含めない", () => {
    const events = [makeEvent("Rt_IC", 0), makeEvent("Rt_Off", 0.3), makeEvent("Lt_IC", 0.6)];
    const result = computeCadence(events);
    expect(result.stepCount).toBe(2);
  });

  it("IC件数が1件以下の場合はnull", () => {
    expect(computeCadence([makeEvent("Rt_IC", 0)]).cadenceStepsPerMin).toBeNull();
    expect(computeCadence([]).cadenceStepsPerMin).toBeNull();
  });
});
