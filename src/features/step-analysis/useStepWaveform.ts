import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import { toCentimeters, type AnalysisSettings } from "../../domain/analysisSettings";
import { computeContinuousStride } from "../../domain/strideWaveform";

export interface StepWaveformState {
  csvTimes: number[];
  rawStride: number[];
  /** 骨盤回旋角が未割当、または骨盤補正を用いない設定の場合はnull。 */
  pelvisCorrectedStride: number[] | null;
  isConfigIncomplete: boolean;
}

function empty(isConfigIncomplete: boolean): StepWaveformState {
  return { csvTimes: [], rawStride: [], pelvisCorrectedStride: null, isConfigIncomplete };
}

/**
 * ステップ動作解析用の、CSV全体の時間軸での連続歩幅波形（formulas.md第3〜6章）。
 * 骨盤回旋角（lowerBackX）が未割当、またはignorePelvisCorrectionがtrueの場合は
 * 骨盤補正なし歩幅のみを算出する（要件定義書14章、ジンバルロック対策）。
 */
export function useStepWaveform(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  settings: AnalysisSettings,
  ignorePelvisCorrection: boolean,
): StepWaveformState {
  return useMemo(() => {
    if (!parsed || !mapping) return empty(true);
    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;
    if (!rightThighY || !leftThighY || !rightShankY || !leftShankY || !time) {
      return empty(true);
    }
    if (settings.thighLength === null || settings.shankLength === null) {
      return empty(true);
    }

    const thighLength = toCentimeters(settings.thighLength, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time]));
    const csvTimes = toRelativeSeconds(rawTimes);

    const columnValues = (header: string) => parsed.rows.map((r) => Number.parseFloat(r[header]));

    const usePelvis = !ignorePelvisCorrection && Boolean(lowerBackX) && settings.pelvisWidth !== null;
    const pelvisWidth = usePelvis ? toCentimeters(settings.pelvisWidth!, settings.lengthUnit) : 0;

    const { rawStride, pelvisCorrectedStride } = computeContinuousStride(
      columnValues(rightThighY),
      columnValues(leftThighY),
      columnValues(rightShankY),
      columnValues(leftShankY),
      usePelvis ? columnValues(lowerBackX!) : null,
      thighLength,
      shankLength,
      pelvisWidth,
    );

    return { csvTimes, rawStride, pelvisCorrectedStride, isConfigIncomplete: false };
  }, [parsed, mapping, settings, ignorePelvisCorrection]);
}
