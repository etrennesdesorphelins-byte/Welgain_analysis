import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import { toCentimeters, type AnalysisSettings } from "../../domain/analysisSettings";
import { computeContinuousStride } from "../../domain/strideWaveform";

export interface StrideWaveformState {
  csvTimes: number[];
  rawStride: number[];
  pelvisCorrectedStride: number[];
  isConfigIncomplete: boolean;
}

function empty(isConfigIncomplete: boolean): StrideWaveformState {
  return { csvTimes: [], rawStride: [], pelvisCorrectedStride: [], isConfigIncomplete };
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
    if (!parsed || !mapping) return empty(true);
    const { rightThighY, leftThighY, rightShankY, leftShankY, lowerBackX, time } = mapping;
    if (!rightThighY || !leftThighY || !rightShankY || !leftShankY || !lowerBackX || !time) {
      return empty(true);
    }
    if (settings.thighLength === null || settings.shankLength === null || settings.pelvisWidth === null) {
      return empty(true);
    }

    const thighLength = toCentimeters(settings.thighLength, settings.lengthUnit);
    const shankLength = toCentimeters(settings.shankLength, settings.lengthUnit);
    const pelvisWidth = toCentimeters(settings.pelvisWidth, settings.lengthUnit);

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time]));
    const csvTimes = toRelativeSeconds(rawTimes);

    const columnValues = (header: string) => parsed.rows.map((r) => Number.parseFloat(r[header]));

    const { rawStride, pelvisCorrectedStride } = computeContinuousStride(
      columnValues(rightThighY),
      columnValues(leftThighY),
      columnValues(rightShankY),
      columnValues(leftShankY),
      columnValues(lowerBackX),
      thighLength,
      shankLength,
      pelvisWidth,
    );

    return { csvTimes, rawStride, pelvisCorrectedStride, isConfigIncomplete: false };
  }, [parsed, mapping, settings]);
}
