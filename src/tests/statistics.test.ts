import { describe, expect, it } from "vitest";
import {
  absoluteLeftRightDifference,
  computeSummaryStatistics,
  signedLeftRightDifference,
} from "../domain/statistics";

describe("computeSummaryStatistics", () => {
  it("複数値の統計量を算出する", () => {
    const result = computeSummaryStatistics([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result.count).toBe(8);
    expect(result.max).toBe(9);
    expect(result.min).toBe(2);
    expect(result.mean).toBeCloseTo(5, 6);
    expect(result.sd).toBeCloseTo(2.13809, 4);
  });

  it("1件のみの場合、標準偏差はnull（NA）", () => {
    const result = computeSummaryStatistics([5]);
    expect(result.count).toBe(1);
    expect(result.mean).toBe(5);
    expect(result.sd).toBeNull();
  });

  it("0件の場合はすべてnull", () => {
    const result = computeSummaryStatistics([]);
    expect(result.count).toBe(0);
    expect(result.mean).toBeNull();
    expect(result.sd).toBeNull();
  });
});

describe("left/right differences", () => {
  it("符号付き左右差と絶対値を算出する", () => {
    expect(signedLeftRightDifference(10, 6)).toBe(4);
    expect(absoluteLeftRightDifference(6, 10)).toBe(4);
  });

  it("片方がnullなら差もnull", () => {
    expect(signedLeftRightDifference(null, 6)).toBeNull();
    expect(absoluteLeftRightDifference(6, null)).toBeNull();
  });
});
