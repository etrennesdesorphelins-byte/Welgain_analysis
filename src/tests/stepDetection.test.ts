import { describe, expect, it } from "vitest";
import { computeBaselineStats, detectMovementStart, detectStepWidthMax } from "../domain/stepDetection";

describe("computeBaselineStats", () => {
  it("選択範囲内の値から平均・標本標準偏差を算出する", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const values = [10, 12, 8, 100, 100];

    const stats = computeBaselineStats(csvTimes, values, 0, 2);

    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(3);
    expect(stats!.mean).toBeCloseTo(10, 6);
    expect(stats!.sd).toBeCloseTo(2, 6);
  });

  it("有効な値が1件以下の場合はnullを返す", () => {
    expect(computeBaselineStats([0, 1], [10, NaN], 0, 1)).toBeNull();
    expect(computeBaselineStats([0, 1], [10, 12], 5, 6)).toBeNull();
  });
});

describe("detectMovementStart", () => {
  it("平均値±2SDを最初に超えた時刻を検出する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5, 6];
    const values = [10, 10, 10, 10, 50, 51, 52];
    const baseline = { mean: 10.1, sd: 0.3, count: 4 };

    expect(detectMovementStart(csvTimes, values, baseline, 0)).toBe(4);
  });

  it("searchFromSec以前の変化は無視する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const values = [10, 50, 10, 10, 60, 10];
    const baseline = { mean: 10, sd: 1, count: 3 };

    expect(detectMovementStart(csvTimes, values, baseline, 3)).toBe(4);
  });

  it("閾値を超える変化が見つからない場合はnullを返す", () => {
    const csvTimes = [0, 1, 2, 3];
    const values = [10, 10.5, 9.5, 10.2];
    const baseline = { mean: 10, sd: 1, count: 4 };

    expect(detectMovementStart(csvTimes, values, baseline, 0)).toBeNull();
  });
});

describe("detectStepWidthMax", () => {
  const zeroBaseline = { mean: 0, sd: 1, count: 10 };

  it("プラス方向の変化でも、基準値から最も離れた時刻（区間内の真の最大値）を返す", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const values = [0, 20, 50, 80, 60, 40];

    expect(detectStepWidthMax(csvTimes, values, zeroBaseline, 0)).toBe(3);
  });

  it("マイナス方向の変化でも、符号を問わず基準値から最も離れた時刻を返す", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const values = [0, -20, -50, -80, -60, -40];

    expect(detectStepWidthMax(csvTimes, values, zeroBaseline, 0)).toBe(3);
  });

  it("基準値が0でない場合も、基準値からの変化量で判定する", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const values = [10, 10, 40, 10, 10];

    expect(detectStepWidthMax(csvTimes, values, { mean: 10, sd: 1, count: 5 }, 0)).toBe(2);
  });

  it("途中に小さなノイズ由来の落ち込みがあっても、そこで打ち切らず区間全体から真の最大値を探す", () => {
    // idx1(50)からidx2(45)へのノイズ的な落ち込みで早期に確定せず、真の最大値idx3(90)を返す。
    const csvTimes = [0, 1, 2, 3, 4];
    const values = [0, 50, 45, 90, 60];

    expect(detectStepWidthMax(csvTimes, values, zeroBaseline, 0)).toBe(3);
  });

  it("fromCsvTimeSec以降のみを探索する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const values = [100, 0, 10, 30, 20, 5];

    // t=0の100は探索範囲外。t=1以降で基準値から最も離れているのはt=3(30)。
    expect(detectStepWidthMax(csvTimes, values, zeroBaseline, 1)).toBe(3);
  });

  it("単調増加のまま終端に達した場合は最後の値（区間内の最大値）を返す", () => {
    const csvTimes = [0, 1, 2, 3];
    const values = [0, 10, 20, 30];

    expect(detectStepWidthMax(csvTimes, values, zeroBaseline, 0)).toBe(3);
  });

  it("有効な値が範囲内に無い場合はnullを返す", () => {
    expect(detectStepWidthMax([0, 1], [NaN, NaN], zeroBaseline, 0)).toBeNull();
    expect(detectStepWidthMax([0, 1], [1, 2], zeroBaseline, 10)).toBeNull();
  });
});
