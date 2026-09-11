import { absoluteStride, toIcRelativeStride, type IcSide } from "./gaitCalculations";

export interface StridePeak {
  index: number;
  side: IcSide;
  csvTimeSec: number;
  /** formulas.md第6章：元の符号付き歩幅（骨盤補正なし歩幅）。 */
  signedStride: number;
  /** formulas.md第7章の変換を検出側に適用した、側基準歩幅（骨盤補正なし）。 */
  sideRelativeStride: number;
  /** 絶対歩幅 = |元の符号付き歩幅|。 */
  absoluteStrideValue: number;
  /** 骨盤補正あり歩幅（元の符号付き）。 */
  pelvisCorrectedStride: number;
  /** 側基準歩幅（骨盤補正あり）。 */
  sideRelativePelvisCorrectedStride: number;
}

/**
 * ノイズ由来の微小な振れをステップとして誤検出しないための最小振幅（cm）。
 * これより小さい山谷は無視し、直前に確定した極値からこの値以上動いて初めて
 * 反転を確定する（ジグザグ法）。歩幅の実測変動（数十cm）に対し、
 * センサー・計算誤差由来のジッタを除去する目的の値。
 */
const MIN_PEAK_PROMINENCE_CM = 3;

/**
 * 要件定義書9章改訂：歩幅波形（骨盤補正なし歩幅＝左下肢距離－右下肢距離、formulas.md第6章）の
 * 極大・極小点を、指定した時間範囲内で検出する。
 * 骨盤補正なし歩幅は左脚が前方なほど正、右脚が前方なほど負になるため、
 * 極大点（正のピーク）は左歩幅、極小点（負のピーク）は右歩幅に対応する
 * （formulas.md第7章のIC側基準変換 S_RtIC=-S, S_LtIC=S と整合）。
 * MIN_PEAK_PROMINENCE_CM未満の振れは反転として確定しない（ジグザグ法）。
 */
export function detectStridePeaks(
  csvTimes: number[],
  rawStride: number[],
  pelvisCorrectedStride: number[],
  rangeStartSec: number,
  rangeEndSec: number,
): StridePeak[] {
  const indices: number[] = [];
  for (let i = 0; i < csvTimes.length; i++) {
    const t = csvTimes[i];
    if (!Number.isFinite(t) || t < rangeStartSec || t > rangeEndSec) continue;
    if (!Number.isFinite(rawStride[i])) continue;
    indices.push(i);
  }
  if (indices.length < 2) return [];

  function buildPeak(index: number, side: IcSide): StridePeak {
    const signedStride = rawStride[index];
    const corrected = pelvisCorrectedStride[index];
    return {
      index,
      side,
      csvTimeSec: csvTimes[index],
      signedStride,
      sideRelativeStride: toIcRelativeStride(signedStride, side),
      absoluteStrideValue: absoluteStride(signedStride),
      pelvisCorrectedStride: corrected,
      sideRelativePelvisCorrectedStride: toIcRelativeStride(corrected, side),
    };
  }

  const peaks: StridePeak[] = [];
  const pivotVal = rawStride[indices[0]];
  let direction: -1 | 0 | 1 = 0;
  let extremeIdx = indices[0];
  let extremeVal = pivotVal;

  for (let k = 1; k < indices.length; k++) {
    const idx = indices[k];
    const val = rawStride[idx];

    if (direction === 0) {
      if (val - pivotVal >= MIN_PEAK_PROMINENCE_CM) {
        direction = 1;
        extremeIdx = idx;
        extremeVal = val;
      } else if (pivotVal - val >= MIN_PEAK_PROMINENCE_CM) {
        direction = -1;
        extremeIdx = idx;
        extremeVal = val;
      }
      continue;
    }

    if (direction === 1) {
      if (val >= extremeVal) {
        extremeVal = val;
        extremeIdx = idx;
      } else if (extremeVal - val >= MIN_PEAK_PROMINENCE_CM) {
        peaks.push(buildPeak(extremeIdx, "Lt"));
        direction = -1;
        extremeIdx = idx;
        extremeVal = val;
      }
    } else {
      if (val <= extremeVal) {
        extremeVal = val;
        extremeIdx = idx;
      } else if (val - extremeVal >= MIN_PEAK_PROMINENCE_CM) {
        peaks.push(buildPeak(extremeIdx, "Rt"));
        direction = 1;
        extremeIdx = idx;
        extremeVal = val;
      }
    }
  }

  return peaks;
}
