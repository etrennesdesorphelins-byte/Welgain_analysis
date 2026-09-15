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
  /** isConfigIncompleteがtrueの場合に、未入力の項目名を列挙する（UIでの具体的な案内用）。 */
  missingFields: string[];
}

function empty(missingFields: string[]): StepWaveformState {
  return {
    csvTimes: [],
    rawStride: [],
    pelvisCorrectedStride: null,
    isConfigIncomplete: true,
    missingFields,
  };
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
    if (!parsed || !mapping) return empty(["CSVファイル"]);
    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;

    const missingFields: string[] = [];
    if (!time) missingFields.push("時刻列");
    if (!rightThighY) missingFields.push("右大腿角度");
    if (!leftThighY) missingFields.push("左大腿角度");
    if (!rightShankY) missingFields.push("右下腿角度");
    if (!leftShankY) missingFields.push("左下腿角度");
    if (settings.thighLength === null) missingFields.push("大腿長");
    if (settings.shankLength === null) missingFields.push("下腿長");
    if (missingFields.length > 0) return empty(missingFields);

    const thighLength = toCentimeters(settings.thighLength!, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength!, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time!]));
    const csvTimes = toRelativeSeconds(rawTimes);

    const columnValues = (header: string) => parsed.rows.map((r) => Number.parseFloat(r[header]));

    const usePelvis = !ignorePelvisCorrection && Boolean(lowerBackX) && settings.pelvisWidth !== null;
    const pelvisWidth = usePelvis ? toCentimeters(settings.pelvisWidth!, settings.lengthUnit) : 0;

    const { rawStride, pelvisCorrectedStride } = computeContinuousStride(
      columnValues(rightThighY!),
      columnValues(leftThighY!),
      columnValues(rightShankY!),
      columnValues(leftShankY!),
      usePelvis ? columnValues(lowerBackX!) : null,
      thighLength,
      shankLength,
      pelvisWidth,
    );

    return { csvTimes, rawStride, pelvisCorrectedStride, isConfigIncomplete: false, missingFields: [] };
  }, [parsed, mapping, settings, ignorePelvisCorrection]);
}
