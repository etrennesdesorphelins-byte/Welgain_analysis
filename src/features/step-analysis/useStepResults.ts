import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import { toCentimeters, type AnalysisSettings } from "../../domain/analysisSettings";
import type { StepTrial } from "../../domain/stepTrial";
import { movementCompletionTimeSec, stepTimeSec } from "../../domain/stepTrial";
import { interpolateAtTime } from "../../domain/interpolation";
import {
  absoluteStride,
  legDistalPosition,
  pelvisCorrectedStrideLength,
  pelvisRotationCorrection,
  rawStrideLength,
  toIcRelativeStride,
} from "../../domain/gaitCalculations";
import { computeSummaryStatistics, type SummaryStatistics } from "../../domain/statistics";

export interface StepResult {
  trialId: string;
  side: "Rt" | "Lt";
  stepTimeSec: number;
  movementCompletionTimeSec: number | null;
  signedStride: number;
  stepRelativeStride: number;
  absoluteStrideValue: number;
  pelvisCorrectedStride: number;
  stepRelativePelvisCorrectedStride: number;
}

export interface StepMissingResult {
  trialId: string;
  reason: string;
}

export interface StepResultsState {
  results: StepResult[];
  missing: StepMissingResult[];
  isConfigIncomplete: boolean;
  stepTimeSummary: SummaryStatistics;
  strideSummary: SummaryStatistics;
}

function emptyState(isConfigIncomplete: boolean): StepResultsState {
  const empty = computeSummaryStatistics([]);
  return { results: [], missing: [], isConfigIncomplete, stepTimeSummary: empty, strideSummary: empty };
}

/** 要件定義書14.2：ステップ動作の歩幅・ステップ時間を算出する（formulas.md第3〜7章を再利用）。 */
export function useStepResults(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  settings: AnalysisSettings,
  trials: StepTrial[],
): StepResultsState {
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
    const baselineLowerBackX = lowerBackValues.find((v) => Number.isFinite(v));
    if (baselineLowerBackX === undefined) return emptyState(true);

    const results: StepResult[] = [];
    const missing: StepMissingResult[] = [];

    for (const trial of trials) {
      const rt = interpolateAtTime(csvTimes, rightThighValues, trial.icCsvTimeSec);
      const lt = interpolateAtTime(csvTimes, leftThighValues, trial.icCsvTimeSec);
      const rs = interpolateAtTime(csvTimes, rightShankValues, trial.icCsvTimeSec);
      const ls = interpolateAtTime(csvTimes, leftShankValues, trial.icCsvTimeSec);
      const lb = interpolateAtTime(csvTimes, lowerBackValues, trial.icCsvTimeSec);

      if (!rt || !lt || !rs || !ls || !lb) {
        missing.push({ trialId: trial.id, reason: "CSVの補間範囲外、または欠損値のため計算できません。" });
        continue;
      }

      const rightLegDistance = legDistalPosition(rt.value, thighLength, rs.value, shankLength);
      const leftLegDistance = legDistalPosition(lt.value, thighLength, ls.value, shankLength);
      const pelvisCorrection = pelvisRotationCorrection(lb.value, baselineLowerBackX, pelvisWidth);
      const signedStride = rawStrideLength(leftLegDistance, rightLegDistance);
      const pelvisCorrectedStride = pelvisCorrectedStrideLength(signedStride, pelvisCorrection);

      results.push({
        trialId: trial.id,
        side: trial.side,
        stepTimeSec: stepTimeSec(trial),
        movementCompletionTimeSec: movementCompletionTimeSec(trial),
        signedStride,
        stepRelativeStride: toIcRelativeStride(signedStride, trial.side),
        absoluteStrideValue: absoluteStride(signedStride),
        pelvisCorrectedStride,
        stepRelativePelvisCorrectedStride: toIcRelativeStride(pelvisCorrectedStride, trial.side),
      });
    }

    return {
      results,
      missing,
      isConfigIncomplete: false,
      stepTimeSummary: computeSummaryStatistics(results.map((r) => r.stepTimeSec)),
      strideSummary: computeSummaryStatistics(results.map((r) => r.stepRelativeStride)),
    };
  }, [parsed, mapping, settings, trials]);
}
