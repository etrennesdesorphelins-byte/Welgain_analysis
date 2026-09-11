import { describe, expect, it } from "vitest";
import { toRelativeSeconds } from "../domain/csv";

describe("toRelativeSeconds", () => {
  it("秒単位の時刻は先頭行を0秒とした相対値に変換する", () => {
    const result = toRelativeSeconds([10, 10.5, 11]);
    expect(result).toEqual([0, 0.5, 1]);
  });

  it("ミリ秒単位のUnix時刻は秒へスケーリングしてから相対値に変換する", () => {
    const base = 1_777_787_304_709;
    const result = toRelativeSeconds([base, base + 50, base + 100]);
    expect(result[0]).toBeCloseTo(0, 6);
    expect(result[1]).toBeCloseTo(0.05, 6);
    expect(result[2]).toBeCloseTo(0.1, 6);
  });

  it("非数値はNaNのまま残す", () => {
    const result = toRelativeSeconds([0, NaN, 1]);
    expect(result[0]).toBe(0);
    expect(Number.isNaN(result[1])).toBe(true);
    expect(result[2]).toBe(1);
  });
});
