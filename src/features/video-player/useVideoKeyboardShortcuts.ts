import { useEffect, useRef } from "react";

export interface VideoKeyboardHandlers {
  onTogglePlay: () => void;
  onStepFrames: (frames: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

/**
 * 要件定義書6章の推奨ショートカット：
 * Space=再生/一時停止、←/→=1フレーム、Shift+←/→=10フレーム、+/-=拡大縮小、R=表示リセット。
 * 入力欄へフォーカス中は誤操作防止のため無効化する。
 */
export function useVideoKeyboardShortcuts(handlers: VideoKeyboardHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const h = handlersRef.current;

      switch (e.key) {
        case " ":
          e.preventDefault();
          h.onTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          h.onStepFrames(e.shiftKey ? -10 : -1);
          break;
        case "ArrowRight":
          e.preventDefault();
          h.onStepFrames(e.shiftKey ? 10 : 1);
          break;
        case "+":
        case "=":
          e.preventDefault();
          h.onZoomIn();
          break;
        case "-":
          e.preventDefault();
          h.onZoomOut();
          break;
        case "r":
        case "R":
          e.preventDefault();
          h.onResetView();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
