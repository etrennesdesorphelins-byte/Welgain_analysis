import { describe, expect, it } from "vitest";
import { evaluateSyncDurationDifference, videoToCsvTime } from "../domain/sync";

describe("videoToCsvTime", () => {
  it("動画全体とCSV全体を比例対応させる", () => {
    expect(videoToCsvTime(5, 10, 20).csvTimeSec).toBeCloseTo(10, 6);
    expect(videoToCsvTime(0, 10, 20).csvTimeSec).toBeCloseTo(0, 6);
    expect(videoToCsvTime(10, 10, 20).csvTimeSec).toBeCloseTo(20, 6);
  });

  it("範囲外の値は0〜CSV終了時刻へクランプする", () => {
    const under = videoToCsvTime(-1, 10, 20);
    expect(under.csvTimeSec).toBe(0);
    expect(under.wasClamped).toBe(true);

    const over = videoToCsvTime(11, 10, 20);
    expect(over.csvTimeSec).toBe(20);
    expect(over.wasClamped).toBe(true);
  });
});

describe("evaluateSyncDurationDifference", () => {
  it("差が小さい場合はnone", () => {
    expect(evaluateSyncDurationDifference(15.0, 15.05).level).toBe("none");
  });

  it("0.2秒超または2%超でnotice", () => {
    expect(evaluateSyncDurationDifference(15.0, 15.3).level).toBe("notice");
  });

  it("1.0秒超または10%超でstrong", () => {
    expect(evaluateSyncDurationDifference(15.0, 16.5).level).toBe("strong");
  });
});
