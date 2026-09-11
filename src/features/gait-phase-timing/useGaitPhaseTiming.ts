import { useMemo } from "react";
import type { GaitEvent } from "../../domain/events";
import { computeGaitPhaseTimings, type GaitPhaseTiming } from "../../domain/gaitCycles";
import { computeCadence, type CadenceResult } from "../../domain/cadence";

export interface GaitPhaseTimingState {
  rightTimings: GaitPhaseTiming[];
  leftTimings: GaitPhaseTiming[];
  cadence: CadenceResult;
}

/** 要件定義書11章：右・左下肢の歩行相時間とケイデンスを算出する。 */
export function useGaitPhaseTiming(events: GaitEvent[]): GaitPhaseTimingState {
  return useMemo(
    () => ({
      rightTimings: computeGaitPhaseTimings(events, "Rt"),
      leftTimings: computeGaitPhaseTimings(events, "Lt"),
      cadence: computeCadence(events),
    }),
    [events],
  );
}
