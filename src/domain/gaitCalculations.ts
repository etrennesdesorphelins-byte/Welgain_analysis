/**
 * docs/formulas.md（Phase 0で既存Excelから転記した計算式）の実装。
 * 関数名・入出力はformulas.md第8章「実装対象の純粋関数」に対応する。
 */

export type IcSide = "Rt" | "Lt";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** formulas.md第3章：セグメント前後成分 = sin(角度) × セグメント長。 */
export function segmentApOffset(angleDeg: number, length: number): number {
  return Math.sin(degToRad(angleDeg)) * length;
}

/** formulas.md第4章：下肢遠位端前後位置 = 大腿前後成分 + 下腿前後成分。 */
export function legDistalPosition(
  thighAngleDeg: number,
  thighLength: number,
  shankAngleDeg: number,
  shankLength: number,
): number {
  return (
    segmentApOffset(thighAngleDeg, thighLength) + segmentApOffset(shankAngleDeg, shankLength)
  );
}

/**
 * formulas.md第5章：骨盤回旋補正量 = sin(現在角 − 基準角) × 骨盤幅。
 * 基準角は既存Excelの挙動に合わせ、CSV全体の先頭行の値を既定とする。
 */
export function pelvisRotationCorrection(
  currentAngleDeg: number,
  baselineAngleDeg: number,
  pelvisWidth: number,
): number {
  return Math.sin(degToRad(currentAngleDeg - baselineAngleDeg)) * pelvisWidth;
}

/** formulas.md第6章：骨盤補正なし歩幅（元の符号付き歩幅） = 左下肢距離 − 右下肢距離。 */
export function rawStrideLength(leftLegDistance: number, rightLegDistance: number): number {
  return leftLegDistance - rightLegDistance;
}

/** formulas.md第6章：骨盤補正あり歩幅 = 骨盤補正なし歩幅 + 骨盤回旋補正量。 */
export function pelvisCorrectedStrideLength(rawStride: number, pelvisCorrection: number): number {
  return rawStride + pelvisCorrection;
}

/**
 * formulas.md第7章：元の符号付き歩幅をIC側基準歩幅へ変換する。
 * S_RtIC = -S, S_LtIC = S
 */
export function toIcRelativeStride(signedStride: number, icSide: IcSide): number {
  return icSide === "Rt" ? -signedStride : signedStride;
}

/** 要件定義書9.2：絶対歩幅 = |元の符号付き歩幅|。 */
export function absoluteStride(signedStride: number): number {
  return Math.abs(signedStride);
}
