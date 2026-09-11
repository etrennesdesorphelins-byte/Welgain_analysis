import { useCallback, useState } from "react";

export interface ZoomPanState {
  scale: number;
  offsetX: number;
  offsetY: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  pan: (dx: number, dy: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

/** 要件定義書6章：拡大・縮小、パン、表示倍率・表示位置のリセット。 */
export function useZoomPan(): ZoomPanState {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, Math.round((s + ZOOM_STEP) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(MIN_SCALE, Math.round((s - ZOOM_STEP) * 100) / 100);
      if (next === MIN_SCALE) {
        setOffsetX(0);
        setOffsetY(0);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setOffsetX((x) => x + dx);
    setOffsetY((y) => y + dy);
  }, []);

  return { scale, offsetX, offsetY, zoomIn, zoomOut, reset, pan };
}
