import { describe, expect, it } from "vitest";
import { interpolateAtTime } from "../domain/interpolation";

describe("interpolateAtTime", () => {
  const times = [0, 0.05, 0.1, 0.15, 0.2];
  const values = [10, 20, 30, 40, 50];

  it("CSVデータ点と完全一致する時刻はそのまま返す", () => {
    const result = interpolateAtTime(times, values, 0.1);
    expect(result).toEqual({ value: 30, isExactMatch: true, lowerIndex: 2, upperIndex: 2, ratio: 0 });
  });

  it("2点間の中間時刻を線形補間する", () => {
    const result = interpolateAtTime(times, values, 0.125);
    expect(result?.isExactMatch).toBe(false);
    expect(result?.lowerIndex).toBe(2);
    expect(result?.upperIndex).toBe(3);
    expect(result?.value).toBeCloseTo(35, 6);
  });

  it("範囲外の時刻はnullを返す", () => {
    expect(interpolateAtTime(times, values, -0.01)).toBeNull();
    expect(interpolateAtTime(times, values, 0.21)).toBeNull();
  });

  it("片側が欠損値の場合はnullを返す（無制限に離れた点を補間しない）", () => {
    const valuesWithGap = [10, 20, NaN, 40, 50];
    const result = interpolateAtTime(times, valuesWithGap, 0.125);
    expect(result).toBeNull();
  });

  it("重複時刻は最初の出現を採用する", () => {
    const dupTimes = [0, 0.05, 0.05, 0.1];
    const dupValues = [10, 20, 999, 30];
    const result = interpolateAtTime(dupTimes, dupValues, 0.05);
    expect(result).toEqual({ value: 20, isExactMatch: true, lowerIndex: 1, upperIndex: 1, ratio: 0 });
  });
});
