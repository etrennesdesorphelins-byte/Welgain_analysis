import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import { toCentimeters, type AnalysisSettings } from "../../domain/analysisSettings";
import type { GaitEvent, IcEventType } from "../../domain/events";
import { interpolateAtTime } from "../../domain/interpolation";
import {
  absoluteStride,
  legDistalPosition,
  pelvisCorrectedStrideLength,
  pelvisRotationCorrection,
  rawStrideLength,
  toIcRelativeStride,
  type IcSide,
} from "../../domain/gaitCalculations";
import {
  absoluteLeftRightDifference,
  computeSummaryStatistics,
  signedLeftRightDifference,
  type SummaryStatistics,
} from "../../domain/statistics";

export interface StrideResult {
  eventId: string;
  eventType: IcEventType;
  icSide: IcSide;
  videoTimeSec: number;
  csvTimeSec: number;
  /** formulas.md：元の符号付き歩幅（＝骨盤補正なし歩幅）。 */
  signedStride: number;
  /** IC側基準歩幅（骨盤補正なし）。 */
  icRelativeStride: number;
  /** 絶対歩幅 = |元の符号付き歩幅|。 */
  absoluteStrideValue: number;
  /** 骨盤補正あり歩幅（元の符号付き）。 */
  pelvisCorrectedStride: number;
  /** IC側基準歩幅（骨盤補正あり）。 */
  icRelativePelvisCorrectedStride: number;
  /** CSVデータ点と厳密一致せず、線形補間で得られた値であるか。 */
  isInterpolated: boolean;
}

export interface StrideMissingResult {
  eventId: string;
  eventType: IcEventType;
  reason: string;
}

export interface StrideResultsState {
  results: StrideResult[];
  missing: StrideMissingResult[];
  /** 歩幅計算に必要な列割当または身体計測値が未入力の場合true。 */
  isConfigIncomplete: boolean;
  rightSummary: SummaryStatistics;
  leftSummary: SummaryStatistics;
  rightSummaryCorrected: SummaryStatistics;
  leftSummaryCorrected: SummaryStatistics;
  signedDifference: number | null;
  absoluteDifference: number | null;
  signedDifferenceCorrected: number | null;
  absoluteDifferenceCorrected: number | null;
}

function emptyState(isConfigIncomplete: boolean): StrideResultsState {
  const emptyStats = computeSummaryStatistics([]);
  return {
    results: [],
    missing: [],
    isConfigIncomplete,
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
 * 要件定義書9章：IC時歩幅の算出。formulas.mdの計算式（第3〜7章）を
 * CSVの線形補間値（第10章）に適用し、IC側基準の歩幅と左右要約統計を求める。
 */
export function useStrideResults(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  settings: AnalysisSettings,
  events: GaitEvent[],
): StrideResultsState {
  return useMemo(() => {
    if (!parsed || !mapping) return emptyState(true);

    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;
    if (!rightThighY || !leftThighY || !rightShankY || !leftShankY || !lowerBackX || !time) {
      return emptyState(true);
    }
    if (settings.thighLength === null || settings.shankLength === null || settings.pelvisWidth === null) {
      return emptyState(true);
    }

    const thighLength = toCentimeters(settings.thighLength, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength, settings.lengthUnit);
    const pelvisWidth = toCentimeters(settings.pelvisWidth, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time]));
    const csvTimes = toRelativeSeconds(rawTimes);
    const rightThighValues = parsed.rows.map((r) => Number.parseFloat(r[rightThighY]));
    const leftThighValues = parsed.rows.map((r) => Number.parseFloat(r[leftThighY]));
    const rightShankValues = parsed.rows.map((r) => Number.parseFloat(r[rightShankY]));
    const leftShankValues = parsed.rows.map((r) => Number.parseFloat(r[leftShankY]));
    const lowerBackValues = parsed.rows.map((r) => Number.parseFloat(r[lowerBackX]));

    // formulas.md第5章：骨盤回旋補正の基準はCSV全体の先頭行。
    const baselineLowerBackX = lowerBackValues.find((v) => Number.isFinite(v));
    if (baselineLowerBackX === undefined) return emptyState(true);

    const results: StrideResult[] = [];
    const missing: StrideMissingResult[] = [];

    const icEvents = events.filter(
      (e): e is GaitEvent & { type: IcEventType } => e.type === "Rt_IC" || e.type === "Lt_IC",
    );

    for (const event of icEvents) {
      const rt = interpolateAtTime(csvTimes, rightThighValues, event.csvTimeSec);
      const lt = interpolateAtTime(csvTimes, leftThighValues, event.csvTimeSec);
      const rs = interpolateAtTime(csvTimes, rightShankValues, event.csvTimeSec);
      const ls = interpolateAtTime(csvTimes, leftShankValues, event.csvTimeSec);
      const lb = interpolateAtTime(csvTimes, lowerBackValues, event.csvTimeSec);

      if (!rt || !lt || !rs || !ls || !lb) {
        missing.push({
          eventId: event.id,
          eventType: event.type,
          reason: "CSVの補間範囲外、または前後に欠損値があるため計算できません。",
        });
        continue;
      }

      const rightLegDistance = legDistalPosition(rt.value, thighLength, rs.value, shankLength);
      const leftLegDistance = legDistalPosition(lt.value, thighLength, ls.value, shankLength);
      const pelvisCorrection = pelvisRotationCorrection(lb.value, baselineLowerBackX, pelvisWidth);
      const signedStride = rawStrideLength(leftLegDistance, rightLegDistance);
      const pelvisCorrectedStride = pelvisCorrectedStrideLength(signedStride, pelvisCorrection);
      const icSide: IcSide = event.type === "Rt_IC" ? "Rt" : "Lt";

      results.push({
        eventId: event.id,
        eventType: event.type,
        icSide,
        videoTimeSec: event.videoTimeSec,
        csvTimeSec: event.csvTimeSec,
        signedStride,
        icRelativeStride: toIcRelativeStride(signedStride, icSide),
        absoluteStrideValue: absoluteStride(signedStride),
        pelvisCorrectedStride,
        icRelativePelvisCorrectedStride: toIcRelativeStride(pelvisCorrectedStride, icSide),
        isInterpolated:
          !rt.isExactMatch || !lt.isExactMatch || !rs.isExactMatch || !ls.isExactMatch || !lb.isExactMatch,
      });
    }

    const rightResults = results.filter((r) => r.icSide === "Rt");
    const leftResults = results.filter((r) => r.icSide === "Lt");

    const rightSummary = computeSummaryStatistics(rightResults.map((r) => r.icRelativeStride));
    const leftSummary = computeSummaryStatistics(leftResults.map((r) => r.icRelativeStride));
    const rightSummaryCorrected = computeSummaryStatistics(
      rightResults.map((r) => r.icRelativePelvisCorrectedStride),
    );
    const leftSummaryCorrected = computeSummaryStatistics(
      leftResults.map((r) => r.icRelativePelvisCorrectedStride),
    );

    return {
      results,
      missing,
      isConfigIncomplete: false,
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
  }, [parsed, mapping, settings, events]);
}
