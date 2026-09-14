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
  /** 骨盤回旋角が未割当、または骨盤補正を用いない設定の場合はnull。 */
  pelvisCorrectedStride: number | null;
  stepRelativePelvisCorrectedStride: number | null;
}

export interface StepMissingResult {
  trialId: string;
  reason: string;
}

export interface StepResultsState {
  results: StepResult[];
  missing: StepMissingResult[];
  isConfigIncomplete: boolean;
  /** 骨盤補正あり歩幅を算出しているか（骨盤回旋角が利用可能、かつ無視する設定でない場合）。 */
  hasPelvisCorrection: boolean;
  stepTimeSummary: SummaryStatistics;
  strideSummary: SummaryStatistics;
}

function emptyState(isConfigIncomplete: boolean): StepResultsState {
  const empty = computeSummaryStatistics([]);
  return {
    results: [],
    missing: [],
    isConfigIncomplete,
    hasPelvisCorrection: false,
    stepTimeSummary: empty,
    strideSummary: empty,
  };
}

/**
 * 要件定義書14.2：ステップ動作の歩幅・ステップ時間を算出する（formulas.md第3〜7章を再利用）。
 * 骨盤回旋角（lowerBackX）はジンバルロック等で単独で異常値になりやすいため、未割当または
 * ignorePelvisCorrectionがtrueの場合は骨盤補正なし歩幅のみを算出し、算出自体は妨げない。
 */
export function useStepResults(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  settings: AnalysisSettings,
  trials: StepTrial[],
  ignorePelvisCorrection: boolean,
): StepResultsState {
  return useMemo(() => {
    if (!parsed || !mapping) return emptyState(true);
    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;
    if (!rightThighY || !leftThighY || !rightShankY || !leftShankY || !time) {
      return emptyState(true);
    }
    if (settings.thighLength === null || settings.shankLength === null) {
      return emptyState(true);
    }

    const thighLength = toCentimeters(settings.thighLength, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time]));
    const csvTimes = toRelativeSeconds(rawTimes);
    const rightThighValues = parsed.rows.map((r) => Number.parseFloat(r[rightThighY]));
    const leftThighValues = parsed.rows.map((r) => Number.parseFloat(r[leftThighY]));
    const rightShankValues = parsed.rows.map((r) => Number.parseFloat(r[rightShankY]));
    const leftShankValues = parsed.rows.map((r) => Number.parseFloat(r[leftShankY]));

    const usePelvis = !ignorePelvisCorrection && Boolean(lowerBackX) && settings.pelvisWidth !== null;
    const pelvisWidth = usePelvis ? toCentimeters(settings.pelvisWidth!, settings.lengthUnit) : null;
    const lowerBackValues = usePelvis ? parsed.rows.map((r) => Number.parseFloat(r[lowerBackX!])) : null;
    const baselineLowerBackX = lowerBackValues?.find((v) => Number.isFinite(v));
    const hasPelvisCorrection = usePelvis && baselineLowerBackX !== undefined;

    const results: StepResult[] = [];
    const missing: StepMissingResult[] = [];

    for (const trial of trials) {
      const rt = interpolateAtTime(csvTimes, rightThighValues, trial.icCsvTimeSec);
      const lt = interpolateAtTime(csvTimes, leftThighValues, trial.icCsvTimeSec);
      const rs = interpolateAtTime(csvTimes, rightShankValues, trial.icCsvTimeSec);
      const ls = interpolateAtTime(csvTimes, leftShankValues, trial.icCsvTimeSec);

      if (!rt || !lt || !rs || !ls) {
        missing.push({ trialId: trial.id, reason: "CSVの補間範囲外、または欠損値のため計算できません。" });
        continue;
      }

      const rightLegDistance = legDistalPosition(rt.value, thighLength, rs.value, shankLength);
      const leftLegDistance = legDistalPosition(lt.value, thighLength, ls.value, shankLength);
      const signedStride = rawStrideLength(leftLegDistance, rightLegDistance);

      let pelvisCorrectedStride: number | null = null;
      let stepRelativePelvisCorrectedStride: number | null = null;
      if (hasPelvisCorrection) {
        const lb = interpolateAtTime(csvTimes, lowerBackValues!, trial.icCsvTimeSec);
        if (lb) {
          const pelvisCorrection = pelvisRotationCorrection(lb.value, baselineLowerBackX!, pelvisWidth!);
          pelvisCorrectedStride = pelvisCorrectedStrideLength(signedStride, pelvisCorrection);
          stepRelativePelvisCorrectedStride = toIcRelativeStride(pelvisCorrectedStride, trial.side);
        }
      }

      results.push({
        trialId: trial.id,
        side: trial.side,
        stepTimeSec: stepTimeSec(trial),
        movementCompletionTimeSec: movementCompletionTimeSec(trial),
        signedStride,
        stepRelativeStride: toIcRelativeStride(signedStride, trial.side),
        absoluteStrideValue: absoluteStride(signedStride),
        pelvisCorrectedStride,
        stepRelativePelvisCorrectedStride,
      });
    }

    return {
      results,
      missing,
      isConfigIncomplete: false,
      hasPelvisCorrection,
      stepTimeSummary: computeSummaryStatistics(results.map((r) => r.stepTimeSec)),
      strideSummary: computeSummaryStatistics(results.map((r) => r.stepRelativeStride)),
    };
  }, [parsed, mapping, settings, trials, ignorePelvisCorrection]);
}
