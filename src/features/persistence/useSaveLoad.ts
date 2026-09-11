import { useCallback, useState } from "react";
import { parseSavedState, type SavedAnalysisState } from "../../domain/persistence";

export interface SaveLoadState {
  isLoading: boolean;
  loadError: string | null;
  saveToFile: (state: SavedAnalysisState, fileName: string) => void;
  loadFromFile: (file: File) => Promise<SavedAnalysisState | null>;
}

/** 要件定義書15.3：解析状態のJSON保存・再読込。動画・CSV本体はJSONへ含めない。 */
export function useSaveLoad(): SaveLoadState {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const saveToFile = useCallback((state: SavedAnalysisState, fileName: string) => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const loadFromFile = useCallback(async (file: File): Promise<SavedAnalysisState | null> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const result = parseSavedState(json);
      if (!result.success || !result.data) {
        setLoadError(result.error ?? "JSONの読込に失敗しました。");
        return null;
      }
      return result.data;
    } catch (err) {
      setLoadError(
        err instanceof Error ? `JSONの読込に失敗しました: ${err.message}` : "JSONの読込に失敗しました。",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, loadError, saveToFile, loadFromFile };
}
