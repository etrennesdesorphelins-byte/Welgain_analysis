import { useMemo } from "react";
import { detectStridePeaks, suggestMinPeakProminenceCm, type StridePeak } from "../../domain/stridePeaks";
import {
  absoluteLeftRightDifference,
  computeSummaryStatistics,
  signedLeftRightDifference,
  type SummaryStatistics,
} from "../../domain/statistics";
import type { StrideWaveformState } from "./useStrideWaveform";

export interface StrideRangeSelection {
  startSec: number;
  endSec: number;
}

export interface StrideStepResult extends StridePeak {
  /** 比例同期（要件定義書7.1）による、おおよその動画時刻。 */
  videoTimeSec: number;
}

export interface StrideRangeResultsState {
  results: StrideStepResult[];
  /** 歩幅計算に必要な列割当または身体計測値が未入力の場合true。 */
  isConfigIncomplete: boolean;
  /** 歩幅波形上で範囲が選択されているか。 */
  hasSelection: boolean;
  /** 選択範囲の振れ幅から提案される、検出に用いる最小振幅（cm）の既定値。 */
  suggestedMinPeakProminenceCm: number | null;
  /** 実際に検出へ用いた最小振幅（cm）。 */
  effectiveMinPeakProminenceCm: number | null;
  rightSummary: SummaryStatistics;
  leftSummary: SummaryStatistics;
  rightSummaryCorrected: SummaryStatistics;
  leftSummaryCorrected: SummaryStatistics;
  signedDifference: number | null;
  absoluteDifference: number | null;
  signedDifferenceCorrected: number | null;
  absoluteDifferenceCorrected: number | null;
}

function emptyState(isConfigIncomplete: boolean, hasSelection: boolean): StrideRangeResultsState {
  const emptyStats = computeSummaryStatistics([]);
  return {
    results: [],
    isConfigIncomplete,
    hasSelection,
    suggestedMinPeakProminenceCm: null,
    effectiveMinPeakProminenceCm: null,
    rightSummary: emptyStats,
    leftSummary: emptyStats,
    rightSummaryCorrected: emptyStats,
    leftSummaryCorrected: emptyStats,
    signedDifference: null,
    absoluteDifference: null,
    signedDifferenceCorrected: null,
    absoluteDifferenceCorrected: null,
  };
}

/**
 * 要件定義書9章改訂：IC登録に頼らず、歩幅波形上で選択した範囲内の極大・極小点
 * （各ステップの歩幅）を自動検出し、左右別要約統計を求める。
 * 検出感度（最小振幅）はminPeakProminenceCmOverrideで上書きできる。省略時（null）は
 * 選択範囲の振れ幅から提案される既定値を用いる（実データでは、既定値のままだと
 * 山谷の途中の副次的な揺れを誤検出することがあるため、UIで調整できるようにしている）。
 */
export function useStrideRangeResults(
  strideWaveform: StrideWaveformState,
  selection: StrideRangeSelection | null,
  toVideoTime: (csvTimeSec: number) => number,
  minPeakProminenceCmOverride: number | null,
): StrideRangeResultsState {
  return useMemo(() => {
    if (strideWaveform.isConfigIncomplete) return emptyState(true, selection !== null);
    if (!selection) return emptyState(false, false);

    const suggested = suggestMinPeakProminenceCm(
      strideWaveform.csvTimes,
      strideWaveform.rawStride,
      selection.startSec,
      selection.endSec,
    );
    const effective = minPeakProminenceCmOverride ?? suggested;

    const peaks = detectStridePeaks(
      strideWaveform.csvTimes,
      strideWaveform.rawStride,
      strideWaveform.pelvisCorrectedStride,
      selection.startSec,
      selection.endSec,
      effective,
    );
    const results: StrideStepResult[] = peaks.map((p) => ({
      ...p,
      videoTimeSec: toVideoTime(p.csvTimeSec),
    }));

    const rightResults = results.filter((r) => r.side === "Rt");
    const leftResults = results.filter((r) => r.side === "Lt");

    const rightSummary = computeSummaryStatistics(rightResults.map((r) => r.sideRelativeStride));
    const leftSummary = computeSummaryStatistics(leftResults.map((r) => r.sideRelativeStride));
    const rightSummaryCorrected = computeSummaryStatistics(
      rightResults.map((r) => r.sideRelativePelvisCorrectedStride),
    );
    const leftSummaryCorrected = computeSummaryStatistics(
      leftResults.map((r) => r.sideRelativePelvisCorrectedStride),
    );

    return {
      results,
      isConfigIncomplete: false,
      hasSelection: true,
      suggestedMinPeakProminenceCm: suggested,
      effectiveMinPeakProminenceCm: effective,
      rightSummary,
      leftSummary,
      rightSummaryCorrected,
      leftSummaryCorrected,
      signedDifference: signedLeftRightDifference(rightSummary.mean, leftSummary.mean),
      absoluteDifference: absoluteLeftRightDifference(rightSummary.mean, leftSummary.mean),
      signedDifferenceCorrected: signedLeftRightDifference(
        rightSummaryCorrected.mean,
        leftSummaryCorrected.mean,
      ),
      absoluteDifferenceCorrected: absoluteLeftRightDifference(
        rightSummaryCorrected.mean,
        leftSummaryCorrected.mean,
      ),
    };
  }, [strideWaveform, selection, toVideoTime, minPeakProminenceCmOverride]);
}
