export interface BaselineStats {
  mean: number;
  sd: number;
  count: number;
}

/**
 * 静止立位区間（選択範囲）における歩幅波形の平均・標本標準偏差を算出する。
 * 有効な値が2点未満の場合はnull（SDを算出できない）。
 */
export function computeBaselineStats(
  csvTimes: number[],
  values: number[],
  rangeStartSec: number,
  rangeEndSec: number,
): BaselineStats | null {
  const inRange: number[] = [];
  for (let i = 0; i < csvTimes.length; i++) {
    const t = csvTimes[i];
    if (!Number.isFinite(t) || t < rangeStartSec || t > rangeEndSec) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    inRange.push(v);
  }
  if (inRange.length < 2) return null;

  const mean = inRange.reduce((sum, v) => sum + v, 0) / inRange.length;
  const variance = inRange.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (inRange.length - 1);
  return { mean, sd: Math.sqrt(variance), count: inRange.length };
}

/**
 * 静止立位区間の平均値±(sdMultiplier×SD)の帯を超えて最初に変化した時刻を、
 * ステップ動作開始として検出する。searchFromSec以降を走査する。
 * 見つからない場合はnull（検出失敗、手動での記録が必要）。
 */
export function detectMovementStart(
  csvTimes: number[],
  values: number[],
  baseline: BaselineStats,
  searchFromSec: number,
  sdMultiplier = 2,
): number | null {
  const threshold = baseline.sd * sdMultiplier;
  for (let i = 0; i < csvTimes.length; i++) {
    const t = csvTimes[i];
    if (!Number.isFinite(t) || t < searchFromSec) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (Math.abs(v - baseline.mean) > threshold) return t;
  }
  return null;
}

/**
 * 動作開始以降（fromCsvTimeSec〜データ末尾）で、静止立位区間の平均値から最も離れた
 * 時刻（歩幅の最大変化点＝ステップ幅最大値）を検出する。プラス方向（左脚前方）・
 * マイナス方向（右脚前方）のどちらへの変化かは問わず、基準値からの絶対的な変化量が
 * 最大となる点（区間内の真の最大値）を採用する
 * （formulas.md第6〜7章の符号規約：左脚前方で正、右脚前方で負）。
 * 実データのノイズによる小さな上下動で途中の点を誤って採用しないよう、
 * 最初に減少した点で打ち切らず、区間全体を走査して真の最大値を探す。
 * 見つからない場合はnull。
 */
export function detectStepWidthMax(
  csvTimes: number[],
  values: number[],
  baseline: BaselineStats,
  fromCsvTimeSec: number,
): number | null {
  let extremeIdx = -1;
  let extremeDeviation = -Infinity;

  for (let i = 0; i < csvTimes.length; i++) {
    const t = csvTimes[i];
    if (!Number.isFinite(t) || t < fromCsvTimeSec) continue;
    const v = values[i];
    if (!Number.isFinite(v)) continue;

    const deviation = Math.abs(v - baseline.mean);
    if (deviation > extremeDeviation) {
      extremeDeviation = deviation;
      extremeIdx = i;
    }
  }

  return extremeIdx >= 0 ? csvTimes[extremeIdx] : null;
}
