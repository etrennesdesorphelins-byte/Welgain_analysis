import { describe, expect, it } from "vitest";
import { computeGaitPhaseTimings, findIcToIcCycles, phaseTimingPercent } from "../domain/gaitCycles";
import type { GaitEvent } from "../domain/events";

function makeEvent(type: GaitEvent["type"], videoTimeSec: number): GaitEvent {
  return { id: `${type}-${videoTimeSec}`, type, videoTimeSec, estimatedFrame: Math.round(videoTimeSec * 30), csvTimeSec: videoTimeSec };
}

describe("findIcToIcCycles", () => {
  it("同側ICのペアを時間順に周期として抽出する", () => {
    const events = [makeEvent("Rt_IC", 0), makeEvent("Rt_IC", 2), makeEvent("Rt_IC", 4)];
    const cycles = findIcToIcCycles(events, "Rt");
    expect(cycles).toHaveLength(2);
    expect(cycles[0].cycleTimeSec).toBeCloseTo(2, 6);
    expect(cycles[1].cycleTimeSec).toBeCloseTo(2, 6);
  });
});

describe("computeGaitPhaseTimings", () => {
  it("標準順序の完全な周期で各歩行相時間を算出する", () => {
    // Rt_IC(0) -> Lt_Off(0.6) -> Lt_IC(1.0) -> Rt_Off(1.5) -> Rt_IC(2.0)
    const events = [
      makeEvent("Rt_IC", 0),
      makeEvent("Lt_Off", 0.6),
      makeEvent("Lt_IC", 1.0),
      makeEvent("Rt_Off", 1.5),
      makeEvent("Rt_IC", 2.0),
    ];
    const timings = computeGaitPhaseTimings(events, "Rt");
    expect(timings).toHaveLength(1);
    const t = timings[0];
    expect(t.isComplete).toBe(true);
    expect(t.cycleTimeSec).toBeCloseTo(2.0, 6);
    expect(t.stanceTimeSec).toBeCloseTo(1.5, 6);
    expect(t.swingTimeSec).toBeCloseTo(0.5, 6);
    expect(t.loadingResponseTimeSec).toBeCloseTo(0.6, 6);
    expect(t.singleSupportTimeSec).toBeCloseTo(0.4, 6);
    expect(t.preSwingTimeSec).toBeCloseTo(0.5, 6);
    expect(t.doubleSupportTimeSec).toBeCloseTo(1.1, 6);

    expect(phaseTimingPercent(t.stanceTimeSec, t.cycleTimeSec)).toBeCloseTo(75, 6);
  });

  it("必要イベントが不足する周期はincomplete（全値null）とする", () => {
    // Lt_Offが欠落
    const events = [
      makeEvent("Rt_IC", 0),
      makeEvent("Lt_IC", 1.0),
      makeEvent("Rt_Off", 1.5),
      makeEvent("Rt_IC", 2.0),
    ];
    const timings = computeGaitPhaseTimings(events, "Rt");
    expect(timings[0].isComplete).toBe(false);
    expect(timings[0].stanceTimeSec).toBeNull();
  });

  it("左下肢は右・左を入れ替えて同様に算出する", () => {
    // Lt_IC(0) -> Rt_Off(0.5) -> Rt_IC(0.9) -> Lt_Off(1.4) -> Lt_IC(2.0)
    const events = [
      makeEvent("Lt_IC", 0),
      makeEvent("Rt_Off", 0.5),
      makeEvent("Rt_IC", 0.9),
      makeEvent("Lt_Off", 1.4),
      makeEvent("Lt_IC", 2.0),
    ];
    const timings = computeGaitPhaseTimings(events, "Lt");
    expect(timings[0].isComplete).toBe(true);
    expect(timings[0].stanceTimeSec).toBeCloseTo(1.4, 6);
  });
});
