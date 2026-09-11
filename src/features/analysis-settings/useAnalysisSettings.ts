import { useState } from "react";
import { EMPTY_ANALYSIS_SETTINGS, type AnalysisSettings, type LengthUnit } from "../../domain/analysisSettings";

export interface AnalysisSettingsState {
  settings: AnalysisSettings;
  setThighLength: (value: number | null) => void;
  setShankLength: (value: number | null) => void;
  setPelvisWidth: (value: number | null) => void;
  setLengthUnit: (unit: LengthUnit) => void;
}

export function useAnalysisSettings(): AnalysisSettingsState {
  const [settings, setSettings] = useState<AnalysisSettings>(EMPTY_ANALYSIS_SETTINGS);

  return {
    settings,
    setThighLength: (value) => setSettings((s) => ({ ...s, thighLength: value })),
    setShankLength: (value) => setSettings((s) => ({ ...s, shankLength: value })),
    setPelvisWidth: (value) => setSettings((s) => ({ ...s, pelvisWidth: value })),
    setLengthUnit: (unit) => setSettings((s) => ({ ...s, lengthUnit: unit })),
  };
}
