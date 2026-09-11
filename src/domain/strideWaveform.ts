import {
  legDistalPosition,
  pelvisCorrectedStrideLength,
  pelvisRotationCorrection,
  rawStrideLength,
} from "./gaitCalculations";

export interface ContinuousStrideSeries {
  /** 骨盤補正なし歩幅（元の符号付き歩幅）の全行連続値。formulas.md第6章。 */
  rawStride: number[];
  /** 骨盤補正あり歩幅の全行連続値。formulas.md第6章。 */
  pelvisCorrectedStride: number[];
}

/**
 * formulas.md第3〜6章の歩幅計算式を、IC等のイベント時刻に限らずCSV全行へ適用し、
 * 連続的な歩幅波形（時間の関数としての歩幅）を算出する。
 * 骨盤回旋補正の基準はCSV先頭の有効値（既存Excelと同じ挙動、formulas.md第5章）。
 */
export function computeContinuousStride(
  rightThighYDeg: number[],
  leftThighYDeg: number[],
  rightShankYDeg: number[],
  leftShankYDeg: number[],
  lowerBackXDeg: number[],
  thighLength: number,
  shankLength: number,
  pelvisWidth: number,
): ContinuousStrideSeries {
  const baseline = lowerBackXDeg.find((v) => Number.isFinite(v));
  const rowCount = rightThighYDeg.length;
  const rawStride: number[] = [];
  const pelvisCorrectedStride: number[] = [];

  for (let i = 0; i < rowCount; i++) {
    if (
      baseline === undefined ||
      !Number.isFinite(rightThighYDeg[i]) ||
      !Number.isFinite(leftThighYDeg[i]) ||
      !Number.isFinite(rightShankYDeg[i]) ||
      !Number.isFinite(leftShankYDeg[i]) ||
      !Number.isFinite(lowerBackXDeg[i])
    ) {
      rawStride.push(NaN);
      pelvisCorrectedStride.push(NaN);
      continue;
    }

    const rightLegDistance = legDistalPosition(
      rightThighYDeg[i],
      thighLength,
      rightShankYDeg[i],
      shankLength,
    );
    const leftLegDistance = legDistalPosition(leftThighYDeg[i], thighLength, leftShankYDeg[i], shankLength);
    const pelvisCorrection = pelvisRotationCorrection(lowerBackXDeg[i], baseline, pelvisWidth);
    const stride = rawStrideLength(leftLegDistance, rightLegDistance);

    rawStride.push(stride);
    pelvisCorrectedStride.push(pelvisCorrectedStrideLength(stride, pelvisCorrection));
  }

  return { rawStride, pelvisCorrectedStride };
}
