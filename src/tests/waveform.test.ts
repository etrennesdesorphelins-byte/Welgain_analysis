import { describe, expect, it } from "vitest";
import { computeWaveformAverage, normalizeCycleToPoints } from "../domain/waveform";

describe("normalizeCycleToPoints", () => {
  it("101点で0〜100%へ線形補間する（線形データはそのまま再現される）", () => {
    const csvTimes = [0, 1, 2, 3, 4];
    const values = [0, 10, 20, 30, 40];
    const points = normalizeCycleToPoints(csvTimes, values, 0, 4, 101);
    expect(points).toHaveLength(101);
    expect(points[0]).toBeCloseTo(0, 6);
    expect(points[50]).toBeCloseTo(20, 6);
    expect(points[100]).toBeCloseTo(40, 6);
  });

  it("範囲外・欠損はnullを返す", () => {
    const csvTimes = [0, 1, 2];
    const values = [0, 10, 20];
    const points = normalizeCycleToPoints(csvTimes, values, -1, 1, 3);
    expect(points[0]).toBeNull();
  });
});

describe("computeWaveformAverage", () => {
  it("各正規化点の平均・標本標準偏差を算出する", () => {
    const cycles = [
      [0, 10, 20],
      [0, 20, 40],
    ];
    const stats = computeWaveformAverage(cycles);
    expect(stats).toHaveLength(3);
    expect(stats[1].mean).toBeCloseTo(15, 6);
    expect(stats[1].validCount).toBe(2);
    expect(stats[1].sd).toBeCloseTo(7.0710678, 5);
  });

  it("有効値が1点のみの場合SDはnull（NA）", () => {
    const cycles = [[5, null, 15]];
    const stats = computeWaveformAverage(cycles);
    expect(stats[0].mean).toBe(5);
    expect(stats[0].sd).toBeNull();
    expect(stats[1].validCount).toBe(0);
  });
});
