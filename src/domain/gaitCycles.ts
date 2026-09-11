import type { GaitEvent, GaitEventType } from "./events";

export type CycleSide = "Rt" | "Lt";

export interface IcToIcCycle {
  side: CycleSide;
  startEvent: GaitEvent;
  endEvent: GaitEvent;
  cycleTimeSec: number;
}

function icType(side: CycleSide): GaitEventType {
  return side === "Rt" ? "Rt_IC" : "Lt_IC";
}

function offType(side: CycleSide): GaitEventType {
  return side === "Rt" ? "Rt_Off" : "Lt_Off";
}

function oppositeSide(side: CycleSide): CycleSide {
  return side === "Rt" ? "Lt" : "Rt";
}

/** 要件定義書12章：同側ICから次の同側ICまでを1歩行周期とする（波形正規化の対象区間）。 */
export function findIcToIcCycles(events: GaitEvent[], side: CycleSide): IcToIcCycle[] {
  const icEvents = events
    .filter((e) => e.type === icType(side))
    .sort((a, b) => a.videoTimeSec - b.videoTimeSec);

  const cycles: IcToIcCycle[] = [];
  for (let i = 0; i < icEvents.length - 1; i++) {
    const startEvent = icEvents[i];
    const endEvent = icEvents[i + 1];
    cycles.push({
      side,
      startEvent,
      endEvent,
      cycleTimeSec: endEvent.videoTimeSec - startEvent.videoTimeSec,
    });
  }
  return cycles;
}

export interface GaitPhaseTiming {
  side: CycleSide;
  startEvent: GaitEvent;
  endEvent: GaitEvent;
  cycleTimeSec: number;
  stanceTimeSec: number | null;
  swingTimeSec: number | null;
  loadingResponseTimeSec: number | null;
  singleSupportTimeSec: number | null;
  preSwingTimeSec: number | null;
  doubleSupportTimeSec: number | null;
  /** 標準順序どおりの4イベント（対側Off→対側IC→同側Off）が周期内に過不足なく揃っているか。 */
  isComplete: boolean;
}

/**
 * 要件定義書11章：右または左下肢の歩行時間パラメータ。
 * 標準順序（8.3章）：同側IC → 対側Off → 対側IC → 同側Off → 次の同側IC。
 */
export function computeGaitPhaseTimings(events: GaitEvent[], side: CycleSide): GaitPhaseTiming[] {
  const cycles = findIcToIcCycles(events, side);
  const opp = oppositeSide(side);
  const sameOffType = offType(side);
  const oppOffType = offType(opp);
  const oppIcType = icType(opp);

  return cycles.map((cycle) => {
    const within = events.filter(
      (e) =>
        e.videoTimeSec > cycle.startEvent.videoTimeSec && e.videoTimeSec < cycle.endEvent.videoTimeSec,
    );
    const sameOff = within.filter((e) => e.type === sameOffType);
    const oppOff = within.filter((e) => e.type === oppOffType);
    const oppIc = within.filter((e) => e.type === oppIcType);

    const isComplete =
      sameOff.length === 1 &&
      oppOff.length === 1 &&
      oppIc.length === 1 &&
      oppOff[0].videoTimeSec < oppIc[0].videoTimeSec &&
      oppIc[0].videoTimeSec < sameOff[0].videoTimeSec;

    if (!isComplete) {
      return {
        side,
        startEvent: cycle.startEvent,
        endEvent: cycle.endEvent,
        cycleTimeSec: cycle.cycleTimeSec,
        stanceTimeSec: null,
        swingTimeSec: null,
        loadingResponseTimeSec: null,
        singleSupportTimeSec: null,
        preSwingTimeSec: null,
        doubleSupportTimeSec: null,
        isComplete: false,
      };
    }

    const stanceTimeSec = sameOff[0].videoTimeSec - cycle.startEvent.videoTimeSec;
    const swingTimeSec = cycle.endEvent.videoTimeSec - sameOff[0].videoTimeSec;
    const loadingResponseTimeSec = oppOff[0].videoTimeSec - cycle.startEvent.videoTimeSec;
    const singleSupportTimeSec = oppIc[0].videoTimeSec - oppOff[0].videoTimeSec;
    const preSwingTimeSec = sameOff[0].videoTimeSec - oppIc[0].videoTimeSec;

    return {
      side,
      startEvent: cycle.startEvent,
      endEvent: cycle.endEvent,
      cycleTimeSec: cycle.cycleTimeSec,
      stanceTimeSec,
      swingTimeSec,
      loadingResponseTimeSec,
      singleSupportTimeSec,
      preSwingTimeSec,
      doubleSupportTimeSec: loadingResponseTimeSec + preSwingTimeSec,
      isComplete: true,
    };
  });
}

/** 要件定義書11章：各指標の一歩行周期に対する割合（%）。 */
export function phaseTimingPercent(sec: number | null, cycleTimeSec: number): number | null {
  if (sec === null || cycleTimeSec <= 0) return null;
  return (sec / cycleTimeSec) * 100;
}
