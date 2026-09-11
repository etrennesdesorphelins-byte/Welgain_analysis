import { useEffect } from "react";

/** 要件定義書15.3：未保存状態で再読み込み・画面終了を行う場合に警告する。 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
