export interface SummaryStatistics {
  count: number;
  max: number | null;
  min: number | null;
  mean: number | null;
  /** 標本標準偏差（分母 n-1）。件数1件以下はnull（要件定義書9.3のNA）。 */
  sd: number | null;
}

/** 要件定義書9.3：件数・最大値・最小値・平均値・標本標準偏差を算出する。 */
export function computeSummaryStatistics(values: number[]): SummaryStatistics {
  const finite = values.filter((v) => Number.isFinite(v));
  const count = finite.length;

  if (count === 0) {
    return { count: 0, max: null, min: null, mean: null, sd: null };
  }

  const max = Math.max(...finite);
  const min = Math.min(...finite);
  const mean = finite.reduce((sum, v) => sum + v, 0) / count;

  let sd: number | null = null;
  if (count >= 2) {
    const variance =
      finite.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (count - 1);
    sd = Math.sqrt(variance);
  }

  return { count, max, min, mean, sd };
}

/** 要件定義書9.3：符号付き左右差 = 右歩幅平均 − 左歩幅平均。 */
export function signedLeftRightDifference(
  rightMean: number | null,
  leftMean: number | null,
): number | null {
  if (rightMean === null || leftMean === null) return null;
  return rightMean - leftMean;
}

/** 要件定義書9.3：左右差絶対値 = |右歩幅平均 − 左歩幅平均|。 */
export function absoluteLeftRightDifference(
  rightMean: number | null,
  leftMean: number | null,
): number | null {
  const diff = signedLeftRightDifference(rightMean, leftMean);
  return diff === null ? null : Math.abs(diff);
}
