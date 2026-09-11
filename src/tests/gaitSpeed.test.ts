import { describe, expect, it } from "vitest";
import { computeGaitSpeed } from "../domain/gaitSpeed";

describe("computeGaitSpeed", () => {
  it("測定距離と時間差から歩行速度を算出する", () => {
    const result = computeGaitSpeed({ measuredDistanceM: 10, startTimeSec: 2, endTimeSec: 12 });
    expect(result.durationSec).toBeCloseTo(10, 6);
    expect(result.speedMPerSec).toBeCloseTo(1.0, 6);
  });

  it("測定距離が未入力の場合は算出しない", () => {
    expect(computeGaitSpeed({ measuredDistanceM: null, startTimeSec: 0, endTimeSec: 5 }).speedMPerSec).toBeNull();
  });

  it("時刻が未入力の場合は算出しない", () => {
    expect(computeGaitSpeed({ measuredDistanceM: 5, startTimeSec: null, endTimeSec: 5 }).speedMPerSec).toBeNull();
  });

  it("終了時刻が開始時刻以前の場合は算出しない", () => {
    expect(
      computeGaitSpeed({ measuredDistanceM: 5, startTimeSec: 5, endTimeSec: 5 }).speedMPerSec,
    ).toBeNull();
    expect(
      computeGaitSpeed({ measuredDistanceM: 5, startTimeSec: 5, endTimeSec: 3 }).speedMPerSec,
    ).toBeNull();
  });
});
