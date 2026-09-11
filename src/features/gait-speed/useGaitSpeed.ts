import { useCallback, useMemo, useState } from "react";
import { computeGaitSpeed, type GaitSpeedResult } from "../../domain/gaitSpeed";

export interface GaitSpeedState {
  measuredDistanceM: number | null;
  startTimeSec: number | null;
  endTimeSec: number | null;
  setMeasuredDistanceM: (v: number | null) => void;
  setStartTimeSec: (v: number | null) => void;
  setEndTimeSec: (v: number | null) => void;
  captureStart: (videoTimeSec: number) => void;
  captureEnd: (videoTimeSec: number) => void;
  result: GaitSpeedResult;
  replaceInput: (input: {
    measuredDistanceM: number | null;
    startTimeSec: number | null;
    endTimeSec: number | null;
  }) => void;
}

/** 要件定義書13章：測定距離と開始・終了時刻から歩行速度を算出する。 */
export function useGaitSpeed(): GaitSpeedState {
  const [measuredDistanceM, setMeasuredDistanceM] = useState<number | null>(null);
  const [startTimeSec, setStartTimeSec] = useState<number | null>(null);
  const [endTimeSec, setEndTimeSec] = useState<number | null>(null);

  const captureStart = useCallback((videoTimeSec: number) => setStartTimeSec(videoTimeSec), []);
  const captureEnd = useCallback((videoTimeSec: number) => setEndTimeSec(videoTimeSec), []);

  const replaceInput = useCallback(
    (input: { measuredDistanceM: number | null; startTimeSec: number | null; endTimeSec: number | null }) => {
      setMeasuredDistanceM(input.measuredDistanceM);
      setStartTimeSec(input.startTimeSec);
      setEndTimeSec(input.endTimeSec);
    },
    [],
  );

  const result = useMemo(
    () => computeGaitSpeed({ measuredDistanceM, startTimeSec, endTimeSec }),
    [measuredDistanceM, startTimeSec, endTimeSec],
  );

  return {
    measuredDistanceM,
    startTimeSec,
    endTimeSec,
    setMeasuredDistanceM,
    setStartTimeSec,
    setEndTimeSec,
    captureStart,
    captureEnd,
    result,
    replaceInput,
  };
}
