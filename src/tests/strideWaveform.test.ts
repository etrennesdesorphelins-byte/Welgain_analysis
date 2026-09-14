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
    expect(Number.isNaN(result.pelvisCorrectedStride![1])).toBe(true);
    expect(Number.isNaN(result.rawStride[0])).toBe(false);
    expect(result.rawStride[0]).toBeCloseTo(result.rawStride[2], 10);
  });

  it("骨盤回旋角の基準行が取得できない場合、骨盤補正あり歩幅のみNaNを返す（骨盤補正なし歩幅は依存しないため算出できる）", () => {
    const result = computeContinuousStride([1], [1], [1], [1], [NaN], 52, 49, 31);
    expect(Number.isNaN(result.rawStride[0])).toBe(false);
    expect(Number.isNaN(result.pelvisCorrectedStride![0])).toBe(true);
  });

  it("骨盤回旋角の列自体が無い（null）場合、骨盤補正なし歩幅のみを算出し、骨盤補正あり歩幅はnullを返す", () => {
    const result = computeContinuousStride([1.4, 1.5], [1.2, 1.3], [-0.5, -0.4], [-0.4, -0.3], null, 52, 49, 31);
    expect(result.pelvisCorrectedStride).toBeNull();
    expect(Number.isNaN(result.rawStride[0])).toBe(false);
    expect(Number.isNaN(result.rawStride[1])).toBe(false);
  });
});
