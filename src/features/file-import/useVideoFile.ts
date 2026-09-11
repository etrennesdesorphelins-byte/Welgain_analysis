import { useCallback, useEffect, useRef, useState } from "react";

export interface VideoFileState {
  file: File | null;
  objectUrl: string | null;
  selectFile: (file: File) => void;
  clear: () => void;
}

/** 動画ファイルの選択とObject URLのライフサイクル管理。要件定義書17章の解放要件に対応。 */
export function useVideoFile(): VideoFileState {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  const selectFile = useCallback((nextFile: File) => {
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
    }
    const url = URL.createObjectURL(nextFile);
    previousUrlRef.current = url;
    setFile(nextFile);
    setObjectUrl(url);
  }, []);

  const clear = useCallback(() => {
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setFile(null);
    setObjectUrl(null);
  }, []);

  return { file, objectUrl, selectFile, clear };
}
