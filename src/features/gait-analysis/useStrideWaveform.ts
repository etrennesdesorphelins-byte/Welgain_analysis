import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import { toCentimeters, type AnalysisSettings } from "../../domain/analysisSettings";
import { computeContinuousStride } from "../../domain/strideWaveform";

export interface StrideWaveformState {
  csvTimes: number[];
  rawStride: number[];
  pelvisCorrectedStride: number[];
  isConfigIncomplete: boolean;
  /** isConfigIncompleteがtrueの場合に、未入力の項目名を列挙する（UIでの具体的な案内用）。 */
  missingFields: string[];
}

function empty(missingFields: string[]): StrideWaveformState {
  return {
    csvTimes: [],
    rawStride: [],
    pelvisCorrectedStride: [],
    isConfigIncomplete: true,
    missingFields,
  };
}

/**
 * 要件定義書9章の歩幅計算式（formulas.md第3〜6章）をCSV全行へ適用し、
 * IC等のイベントに限らない連続的な歩幅波形を算出する。
 */
export function useStrideWaveform(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  settings: AnalysisSettings,
): StrideWaveformState {
  return useMemo(() => {
    if (!parsed || !mapping) return empty(["CSVファイル"]);
    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;

    const missingFields: string[] = [];
    if (!time) missingFields.push("時刻列");
    if (!rightThighY) missingFields.push("右大腿角度");
    if (!leftThighY) missingFields.push("左大腿角度");
    if (!rightShankY) missingFields.push("右下腿角度");
    if (!leftShankY) missingFields.push("左下腿角度");
    if (!lowerBackX) missingFields.push("骨盤回旋角");
    if (settings.thighLength === null) missingFields.push("大腿長");
    if (settings.shankLength === null) missingFields.push("下腿長");
    if (settings.pelvisWidth === null) missingFields.push("骨盤幅");
    if (missingFields.length > 0) return empty(missingFields);

    const thighLength = toCentimeters(settings.thighLength!, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength!, settings.lengthUnit);
    const pelvisWidth = toCentimeters(settings.pelvisWidth!, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time!]));
    const csvTimes = toRelativeSeconds(rawTimes);

    const columnValues = (header: string) => parsed.rows.map((r) => Number.parseFloat(r[header]));

    const { rawStride, pelvisCorrectedStride } = computeContinuousStride(
      columnValues(rightThighY!),
      columnValues(leftThighY!),
      columnValues(rightShankY!),
      columnValues(leftShankY!),
      columnValues(lowerBackX!),
      thighLength,
      shankLength,
      pelvisWidth,
    );

    // 歩行解析ではlowerBackXを必須列としているため、pelvisCorrectedStrideはnullにならない。
    return {
      csvTimes,
      rawStride,
      pelvisCorrectedStride: pelvisCorrectedStride ?? [],
      isConfigIncomplete: false,
      missingFields: [],
    };
  }, [parsed, mapping, settings]);
}
