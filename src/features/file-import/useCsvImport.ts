import { useCallback, useMemo, useState } from "react";
import type {
  ColumnMapping,
  CsvColumnKey,
  CsvValidationResult,
  ParsedCsv,
} from "../../domain/csv";
import { autoMapColumns } from "./csvColumnMapping";
import { parseCsvFile } from "./csvParser";
import { validateCsv } from "./csvValidation";

export interface CsvImportState {
  parsed: ParsedCsv | null;
  mapping: ColumnMapping | null;
  validation: CsvValidationResult | null;
  isLoading: boolean;
  loadError: string | null;
  loadFile: (file: File) => Promise<void>;
  setColumnMapping: (key: CsvColumnKey, header: string | null) => void;
  clear: () => void;
}

export function useCsvImport(): CsvImportState {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadError(null);
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
    setMapping((prev) => (prev ? { ...prev, [key]: header } : prev));
  }, []);

  const clear = useCallback(() => {
    setParsed(null);
    setMapping(null);
    setLoadError(null);
  }, []);

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
    loadFile,
    setColumnMapping,
    clear,
  };
}
