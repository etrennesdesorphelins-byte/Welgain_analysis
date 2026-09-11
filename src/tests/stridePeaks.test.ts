import { describe, expect, it } from "vitest";
import { detectStridePeaks } from "../domain/stridePeaks";
import { absoluteStride, toIcRelativeStride } from "../domain/gaitCalculations";

describe("detectStridePeaks", () => {
  it("大きな振幅の交互スイングを、極大=左・極小=右として検出する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const rawStride = [0, 10, -10, 10, -10, 0];
    const pelvisCorrectedStride = rawStride.map((v) => v + 1);

    const peaks = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 5);

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

    const [first] = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 5);

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

    const peaks = detectStridePeaks(csvTimes, rawStride, pelvisCorrectedStride, 0, 4);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([[3, "Lt", 10]]);
  });

  it("振幅がすべて閾値未満の場合は空配列を返す", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const rawStride = [0, 1, 2, 1, 0];

    expect(detectStridePeaks(csvTimes, rawStride, rawStride, 0, 4)).toEqual([]);
  });

  it("選択範囲外の極値は除外する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5];
    const rawStride = [0, 10, -10, 10, -10, 0];

    const peaks = detectStridePeaks(csvTimes, rawStride, rawStride, 1, 4);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([
      [2, "Rt", -10],
      [3, "Lt", 10],
    ]);
  });

  it("欠損値（NaN）の行を飛び越えて検出する", () => {
    const csvTimes = [0, 1, 2, 3, 4, 5, 6];
    const rawStride = [0, 10, NaN, -10, 10, -10, 0];

    const peaks = detectStridePeaks(csvTimes, rawStride, rawStride, 0, 6);

    expect(peaks.map((p) => [p.index, p.side, p.signedStride])).toEqual([
      [1, "Lt", 10],
      [3, "Rt", -10],
      [4, "Lt", 10],
      [5, "Rt", -10],
    ]);
  });

  it("有効な点が1件以下の場合は空配列を返す", () => {
    expect(detectStridePeaks([0], [0], [0], 0, 0)).toEqual([]);
    expect(detectStridePeaks([0, 1], [0, 10], [0, 10], 100, 200)).toEqual([]);
  });
});
