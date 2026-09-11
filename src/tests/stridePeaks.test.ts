import { describe, expect, it } from "vitest";
import { detectStridePeaks, suggestMinPeakProminenceCm } from "../domain/stridePeaks";
import { absoluteStride, toIcRelativeStride } from "../domain/gaitCalculations";

describe("detectStridePeaks", () => {
  it("大きな振幅の交互スイングを、極大=左・極小=右として検出する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const rawStride = [0, 10, -10, 10, -10, 0];
    const pelvisCorrectedStride = rawStride.map((v) => v + 1);

    const peaks = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 5, 3);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([
      [1, "Lt", 10],
      [2, "Rt", -10],
      [3, "Lt", 10],
      [4, "Rt", -10],
    ]);
  });

  it("側基準歩幅・絶対歩幅・骨盤補正あり歩幅の値がformulas.mdの変換式と一致する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const rawStride = [0, 10, -10, 10, -10, 0];
    const pelvisCorrectedStride = rawStride.map((v) => v + 1);

    const [first] = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 5, 3);

    expect(first.sideRelativeStride).toBeCloseTo(toIcRelativeStride(first.signedStride, first.side), 6);
    expect(first.absoluteStrideValue).toBeCloseTo(absoluteStride(first.signedStride), 6);
    expect(first.pelvisCorrectedStride).toBeCloseTo(first.signedStride + 1, 6);
    expect(first.sideRelativePelvisCorrectedStride).toBeCloseTo(
      toIcRelativeStride(first.pelvisCorrectedStride, first.side),
      6,
    );
  });

  it("最小振幅未満の小さな揺れはノイズとして無視する", () => {
    // idx1(5)からidx2(4)への1cmの落ち込みは閾値(3cm)未満のため、ピークとして確定しない。
    const csvTimes = [0, 1, 2, 3, 4];
    const rawStride = [0, 5, 4, 10, 2];
    const pelvisCorrectedStride = rawStride;

    const peaks = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 4, 3);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([[3, "Lt", 10]]);
  });

  it("閾値を引き上げると、山の途中にある副次的な揺れ（肩）を1つの山へ統合できる", () => {
    // idx1(50)→idx2(46)→idx3(80): 4cmの落ち込みは、閾値3cmでは別の山谷として検出されてしまうが、
    // 閾値を5cmに引き上げると、その揺れを無視してidx3(80)のみを本当の山として検出する。
    const csvTimes = [0, 1, 2, 3, 4];
    const rawStride = [0, 50, 46, 80, 0];

    const withSmallThreshold = detectStridePeaks(csvTimes, rawStride, rawStride, 0, 4, 3);
    expect(withSmallThreshold.map((p) => [p.index, p.side])).toEqual([
      [1, "Lt"],
      [2, "Rt"],
      [3, "Lt"],
    ]);

    const withLargerThreshold = detectStridePeaks(csvTimes, rawStride, rawStride, 0, 4, 5);
    expect(withLargerThreshold.map((p) => [p.index, p.side])).toEqual([[3, "Lt"]]);
  });

  it("振幅がすべて閾値未満の場合は空配列を返す", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const rawStride = [0, 1, 2, 1, 0];

    expect(detectStridePeaks(csvTimes, rawStride, rawStride, 0, 4, 3)).toEqual([]);
  });

  it("選択範囲外の極値は除外する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const rawStride = [0, 10, -10, 10, -10, 0];

    const peaks = detectStridePeaks(csvTimes, rawStride, rawStride, 1, 4, 3);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([
      [2, "Rt", -10],
      [3, "Lt", 10],
    ]);
  });

  it("欠損値（NaN）の行を飛び越えて検出する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5, 6];
    const rawStride = [0, 10, NaN, -10, 10, -10, 0];

    const peaks = detectStridePeaks(csvTimes, rawStride, rawStride, 0, 6, 3);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([
      [1, "Lt", 10],
      [3, "Rt", -10],
      [4, "Lt", 10],
      [5, "Rt", -10],
    ]);
  });

  it("有効な点が1件以下の場合は空配列を返す", () => {
    expect(detectStridePeaks([0], [0], [0], 0, 0, 3)).toEqual([]);
    expect(detectStridePeaks([0, 1], [0, 10], [0, 10], 100, 200, 3)).toEqual([]);
  });
});

describe("suggestMinPeakProminenceCm", () => {
  it("選択範囲内の振れ幅（最大値-最小値）の15%を提案する", () => {
    const csvTimes = [0, 1, 2, 3];
    const rawStride = [0, 100, -100, 0];

    expect(suggestMinPeakProminenceCm(csvTimes, rawStride, 0, 3)).toBeCloseTo(30, 6);
  });

  it("選択範囲外の値は振れ幅の計算に含めない", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const rawStride = [0, 1000, 10, -10, -1000];

    expect(suggestMinPeakProminenceCm(csvTimes, rawStride, 1.5, 3.5)).toBeCloseTo((10 - -10) * 0.15, 6);
  });

  it("振れ幅がほぼ0の場合でも最低1cmを下回らない", () => {
    const csvTimes = [0, 1, 2];
    const rawStride = [5, 5, 5];

    expect(suggestMinPeakProminenceCm(csvTimes, rawStride, 0, 2)).toBe(1);
  });

  it("有効な値が範囲内に無い場合は下限値を返す", () => {
    expect(suggestMinPeakProminenceCm([0, 1], [NaN, NaN], 0, 1)).toBe(1);
    expect(suggestMinPeakProminenceCm([0, 1], [1, 2], 10, 20)).toBe(1);
  });
});
