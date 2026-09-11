export interface InterpolationResult {
  value: number;
  isExactMatch: boolean;
  lowerIndex: number;
  upperIndex: number;
  /** 0でlowerIndex側、1でupperIndex側。isExactMatch時は0。 */
  ratio: number;
}

/** times内で「times[idx] >= t」となる最小のidxを返す（times は非減少である前提）。 */
function lowerBound(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * 要件定義書10章・formulas.md第9章：CSV時刻配列に対する二分探索と線形補間。
 * - 時刻がCSVデータ点と一致：その点を返す（重複時刻は最初の出現を採用）
 * - 範囲外、または補間対象の前後どちらかが欠損：nullを返す（無制限に離れた点を補間しない）
 */
export function interpolateAtTime(
  times: number[],
  values: number[],
  t: number,
): InterpolationResult | null {
  if (times.length === 0) return null;

  const idx = lowerBound(times, t);

  if (idx < times.length && times[idx] === t) {
    const value = values[idx];
    if (!Number.isFinite(value)) return null;
    return { value, isExactMatch: true, lowerIndex: idx, upperIndex: idx, ratio: 0 };
  }

  if (idx === 0 || idx === times.length) return null;

  const lowerIndex = idx - 1;
  const upperIndex = idx;
  const t1 = times[lowerIndex];
  const t2 = times[upperIndex];
  const v1 = values[lowerIndex];
  const v2 = values[upperIndex];
  if (!Number.isFinite(v1) || !Number.isFinite(v2)) return null;

  const ratio = (t - t1) / (t2 - t1);
  return { value: v1 + ratio * (v2 - v1), isExactMatch: false, lowerIndex, upperIndex, ratio };
}
