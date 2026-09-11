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

/** suggestMinPeakProminenceCmが提案する振幅比率（選択範囲内の振れ幅に対する割合）。 */
const DEFAULT_PROMINENCE_RATIO = 0.15;
/** 振れ幅がほぼ0（平坦なデータ）の場合でも閾値が0にならないようにする下限（cm）。 */
const MIN_PROMINENCE_FLOOR_CM = 1;

/**
 * 選択範囲内の歩幅波形の振れ幅（最大値－最小値）から、適切と思われる最小振幅閾値を提案する。
 * 実データではノイズや副次的な揺れの大きさが被験者・区間ごとに異なるため、固定値ではなく
 * 選択範囲自体の振れ幅に対する比率で決めることで、多くの場合に妥当な既定値となるようにする。
 * 検出結果に余分な山谷が混じる場合は、この値をUIで引き上げて再検出できる。
 */
export function suggestMinPeakProminenceCm(
  csvTimes: number[],
  rawStride: number[],
  rangeStartSec: number,
  rangeEndSec: number,
): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < csvTimes.length; i++) {
    const t = csvTimes[i];
    if (!Number.isFinite(t) || t < rangeStartSec || t > rangeEndSec) continue;
    const v = rawStride[i];
    if (!Number.isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return MIN_PROMINENCE_FLOOR_CM;
  return Math.max(MIN_PROMINENCE_FLOOR_CM, (max - min) * DEFAULT_PROMINENCE_RATIO);
}

/**
 * 要件定義書9章改訂：歩幅波形（骨盤補正なし歩幅＝左下肢距離－右下肢距離、formulas.md第6章）の
 * 極大・極小点を、指定した時間範囲内で検出する。
 * 骨盤補正なし歩幅は左脚が前方なほど正、右脚が前方なほど負になるため、
 * 極大点（正のピーク）は左歩幅、極小点（負のピーク）は右歩幅に対応する
 * （formulas.md第7章のIC側基準変換 S_RtIC=-S, S_LtIC=S と整合）。
 * minPeakProminenceCm未満の振れは反転として確定しない（ジグザグ法）。
 * 大きすぎる副次的な揺れが実データで混入する場合は、呼び出し側でこの値を引き上げること
 * （suggestMinPeakProminenceCmは目安の既定値を提案するのみで、常に正しいとは限らない）。
 */
export function detectStridePeaks(
  csvTimes: number[],
  rawStride: number[],
  pelvisCorrectedStride: number[],
  rangeStartSec: number,
  rangeEndSec: number,
  minPeakProminenceCm: number,
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
      if (val - pivotVal >= minPeakProminenceCm) {
        direction = 1;
        extremeIdx = idx;
        extremeVal = val;
      } else if (pivotVal - val >= minPeakProminenceCm) {
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
      } else if (extremeVal - val >= minPeakProminenceCm) {
        peaks.push(buildPeak(extremeIdx, "Lt"));
        direction = -1;
        extremeIdx = idx;
        extremeVal = val;
      }
    } else {
      if (val <= extremeVal) {
        extremeVal = val;
        extremeIdx = idx;
      } else if (val - extremeVal >= minPeakProminenceCm) {
        peaks.push(buildPeak(extremeIdx, "Rt"));
        direction = 1;
        extremeIdx = idx;
        extremeVal = val;
      }
    }
  }

  return peaks;
}
