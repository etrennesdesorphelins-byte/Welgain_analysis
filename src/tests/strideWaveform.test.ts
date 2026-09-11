import { describe, expect, it } from "vitest";
import { computeContinuousStride } from "../domain/strideWaveform";

describe("computeContinuousStride", () => {
  it("欠損値を含む行はNaNを返し、他の行の計算には影響しない", () => {
    const result = computeContinuousStride(
      [1.4, NaN, 1.4],
      [1.2, 1.2, 1.2],
      [-0.5, -0.5, -0.5],
      [-0.4, -0.4, -0.4],
      [-1.1, -1.1, -1.1],
      52,
      49,
      31,
    );

    expect(Number.isNaN(result.rawStride[1])).toBe(true);
    expect(Number.isNaN(result.pelvisCorrectedStride[1])).toBe(true);
    expect(Number.isNaN(result.rawStride[0])).toBe(false);
    expect(result.rawStride[0]).toBeCloseTo(result.rawStride[2], 10);
  });

  it("骨盤回旋角の基準行がまったく取得できない場合はすべてNaNを返す", () => {
    const result = computeContinuousStride([1], [1], [1], [1], [NaN], 52, 49, 31);
    expect(Number.isNaN(result.rawStride[0])).toBe(true);
    expect(Number.isNaN(result.pelvisCorrectedStride[0])).toBe(true);
  });
});
