import { useCallback, useMemo, useState } from "react";
import {
  applySyntheticTimeColumn,
  SYNTHETIC_TIME_COLUMN,
  type ColumnMapping,
  type CsvColumnKey,
  type CsvValidationResult,
  type ParsedCsv,
} from "../../domain/csv";
import { applyPelvisAngleCorrection } from "../../domain/pelvisAngleCorrection";
import { autoMapColumns } from "./csvColumnMapping";
import { parseCsvFile } from "./csvParser";
import { validateCsv } from "./csvValidation";

export interface CsvImportState {
  parsed: ParsedCsv | null;
  mapping: ColumnMapping | null;
  validation: CsvValidationResult | null;
  isLoading: boolean;
  loadError: string | null;
  /** 時刻列が実測ではなく、行番号と仮定周波数から生成した推定値であるか。 */
  isTimeEstimated: boolean;
  /** isTimeEstimated時に使用した仮定サンプリング周波数(Hz)。 */
  assumedSampleRateHz: number | null;
  /**
   * 骨盤回旋角の補正オプション（±180°の符号反転を連続化し、CSV先頭の値を0°とする）を適用しているか。
   * 有効時はparsedの骨盤回旋角列が補正後の値に置き換わる。
   */
  isPelvisAngleCorrected: boolean;
  setPelvisAngleCorrected: (enabled: boolean) => void;
  loadFile: (file: File) => Promise<void>;
  setColumnMapping: (key: CsvColumnKey, header: string | null) => void;
  /** 時刻列が使用不能な場合の代替：行番号×(1/assumedSampleRateHz)で相対秒を生成し、時刻列として採用する。 */
  applySyntheticTime: (assumedSampleRateHz: number) => void;
  clear: () => void;
}

export function useCsvImport(): CsvImportState {
  const [rawParsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTimeEstimated, setIsTimeEstimated] = useState(false);
  const [assumedSampleRateHz, setAssumedSampleRateHz] = useState<number | null>(null);
  const [isPelvisAngleCorrected, setPelvisAngleCorrected] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadError(null);
    setIsTimeEstimated(false);
    setAssumedSampleRateHz(null);
    setPelvisAngleCorrected(false);
    try {
      const result = await parseCsvFile(file);
      setParsed(result);
      setMapping(autoMapColumns(result.headers));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "CSVの読込に失敗しました。");
      setParsed(null);
      setMapping(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setColumnMapping = useCallback((key: CsvColumnKey, header: string | null) => {
    // 実測時刻列へ手動で切り替えた場合は推定フラグを解除する。
    if (key === "time" && header !== SYNTHETIC_TIME_COLUMN) {
      setIsTimeEstimated(false);
      setAssumedSampleRateHz(null);
    }
    setMapping((prev) => (prev ? { ...prev, [key]: header } : prev));
  }, []);

  const applySyntheticTime = useCallback((rateHz: number) => {
    setParsed((prev) => (prev ? applySyntheticTimeColumn(prev, rateHz) : prev));
    setMapping((prev) => (prev ? { ...prev, time: SYNTHETIC_TIME_COLUMN } : prev));
    setIsTimeEstimated(true);
    setAssumedSampleRateHz(rateHz);
  }, []);

  const clear = useCallback(() => {
    setParsed(null);
    setMapping(null);
    setLoadError(null);
    setIsTimeEstimated(false);
    setAssumedSampleRateHz(null);
    setPelvisAngleCorrected(false);
  }, []);

  const lowerBackXColumn = mapping?.lowerBackX ?? null;
  const parsed = useMemo(() => {
    if (!rawParsed || !isPelvisAngleCorrected || !lowerBackXColumn) return rawParsed;
    return applyPelvisAngleCorrection(rawParsed, lowerBackXColumn);
  }, [rawParsed, isPelvisAngleCorrected, lowerBackXColumn]);

  const validation = useMemo(() => {
    if (!parsed || !mapping) return null;
    return validateCsv(parsed, mapping);
  }, [parsed, mapping]);

  return {
    parsed,
    mapping,
    validation,
    isLoading,
    loadError,
    isTimeEstimated,
    assumedSampleRateHz,
    isPelvisAngleCorrected,
    setPelvisAngleCorrected,
    loadFile,
    setColumnMapping,
    applySyntheticTime,
    clear,
  };
}
