import {
  legDistalPosition,
  pelvisCorrectedStrideLength,
  pelvisRotationCorrection,
  rawStrideLength,
} from "./gaitCalculations";

export interface ContinuousStrideSeries {
  /** 骨盤補正なし歩幅（元の符号付き歩幅）の全行連続値。formulas.md第6章。 */
  rawStride: number[];
  /**
   * 骨盤補正あり歩幅の全行連続値。formulas.md第6章。
   * lowerBackXDegがnull（骨盤回旋角が未割当、またはジンバルロック等により
   * 補正を用いない設定の場合）はnull。
   */
  pelvisCorrectedStride: number[] | null;
}

/**
 * formulas.md第3〜6章の歩幅計算式を、IC等のイベント時刻に限らずCSV全行へ適用し、
 * 連続的な歩幅波形（時間の関数としての歩幅）を算出する。
 * 骨盤回旋補正の基準はCSV先頭の有効値（既存Excelと同じ挙動、formulas.md第5章）。
 *
 * lowerBackXDegにnullを渡すと、骨盤補正なし歩幅のみを算出する（骨盤補正あり歩幅はnull）。
 * 骨盤回旋角はジンバルロック等で単独で異常値になりやすく、骨盤補正なし歩幅はそもそも
 * 骨盤回旋角に依存しない式（左下肢距離－右下肢距離）のため、骨盤回旋角の欠落・異常が
 * 骨盤補正なし歩幅の算出を妨げないようにしている。
 */
export function computeContinuousStride(
  rightThighYDeg: number[],
  leftThighYDeg: number[],
  rightShankYDeg: number[],
  leftShankYDeg: number[],
  lowerBackXDeg: number[] | null,
  thighLength: number,
  shankLength: number,
  pelvisWidth: number,
): ContinuousStrideSeries {
  const baseline = lowerBackXDeg?.find((v) => Number.isFinite(v));
  const rowCount = rightThighYDeg.length;
  const rawStride: number[] = [];
  const pelvisCorrectedStride: number[] | null = lowerBackXDeg ? [] : null;

  for (let i = 0; i < rowCount; i++) {
    const legInputsValid =
      Number.isFinite(rightThighYDeg[i]) &&
      Number.isFinite(leftThighYDeg[i]) &&
      Number.isFinite(rightShankYDeg[i]) &&
      Number.isFinite(leftShankYDeg[i]);

    if (!legInputsValid) {
      rawStride.push(NaN);
      pelvisCorrectedStride?.push(NaN);
      continue;
    }

    const rightLegDistance = legDistalPosition(rightThighYDeg[i], thighLength, rightShankYDeg[i], shankLength);
    const leftLegDistance = legDistalPosition(leftThighYDeg[i], thighLength, leftShankYDeg[i], shankLength);
    const stride = rawStrideLength(leftLegDistance, rightLegDistance);
    rawStride.push(stride);

    if (pelvisCorrectedStride) {
      const pelvisAngle = lowerBackXDeg![i];
      if (baseline !== undefined && Number.isFinite(pelvisAngle)) {
        const pelvisCorrection = pelvisRotationCorrection(pelvisAngle, baseline, pelvisWidth);
        pelvisCorrectedStride.push(pelvisCorrectedStrideLength(stride, pelvisCorrection));
      } else {
        pelvisCorrectedStride.push(NaN);
      }
    }
  }

  return { rawStride, pelvisCorrectedStride };
}
