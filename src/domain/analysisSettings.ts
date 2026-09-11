export type LengthUnit = "cm" | "m";

export interface AnalysisSettings {
  thighLength: number | null;
  shankLength: number | null;
  pelvisWidth: number | null;
  lengthUnit: LengthUnit;
}

export const EMPTY_ANALYSIS_SETTINGS: AnalysisSettings = {
  thighLength: null,
  shankLength: null,
  pelvisWidth: null,
  lengthUnit: "cm",
};

/** 要件定義書4.3：単位はcmまたはmを選択し、内部計算時はcmへ統一する。 */
export function toCentimeters(value: number, unit: LengthUnit): number {
  return unit === "m" ? value * 100 : value;
}

export function isAnalysisSettingsComplete(
  settings: AnalysisSettings,
): settings is { thighLength: number; shankLength: number; pelvisWidth: number; lengthUnit: LengthUnit } {
  return (
    settings.thighLength !== null &&
    settings.shankLength !== null &&
    settings.pelvisWidth !== null &&
    settings.thighLength > 0 &&
    settings.shankLength > 0 &&
    settings.pelvisWidth > 0
  );
}
