import { describe, expect, it } from "vitest";
import { findDuplicateEvent, findEventOrderWarnings, type GaitEvent } from "../domain/events";

function makeEvent(overrides: Partial<GaitEvent>): GaitEvent {
  return {
    id: Math.random().toString(36),
    type: "Rt_IC",
    videoTimeSec: 0,
    estimatedFrame: 0,
    csvTimeSec: 0,
    ...overrides,
  };
}

describe("findEventOrderWarnings", () => {
  it("標準順序（Rt_IC→Lt_Off→Lt_IC→Rt_Off）は警告なし", () => {
    const events = [
      makeEvent({ type: "Rt_IC", videoTimeSec: 0 }),
      makeEvent({ type: "Lt_Off", videoTimeSec: 1 }),
      makeEvent({ type: "Lt_IC", videoTimeSec: 2 }),
      makeEvent({ type: "Rt_Off", videoTimeSec: 3 }),
    ];
    expect(findEventOrderWarnings(events)).toHaveLength(0);
  });

  it("標準順序と異なる遷移を検出する", () => {
    const events = [
      makeEvent({ type: "Rt_IC", videoTimeSec: 0 }),
      makeEvent({ type: "Rt_IC", videoTimeSec: 1 }),
    ];
    const warnings = findEventOrderWarnings(events);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("Lt_Off");
  });

  it("同一フレームの異なるイベントは順序警告の対象外", () => {
    const events = [
      makeEvent({ type: "Rt_IC", videoTimeSec: 1 }),
      makeEvent({ type: "Lt_Off", videoTimeSec: 1 }),
    ];
    expect(findEventOrderWarnings(events)).toHaveLength(0);
  });
});

describe("findDuplicateEvent", () => {
  it("同一フレーム・同一種類のイベントを検出する", () => {
    const existing = [makeEvent({ type: "Rt_IC", estimatedFrame: 42, videoTimeSec: 1.4 })];
    const dup = findDuplicateEvent(existing, "Rt_IC", 1.4, 42);
    expect(dup).not.toBeNull();
  });

  it("種類が異なれば重複としない（同一フレーム許可）", () => {
    const existing = [makeEvent({ type: "Rt_IC", estimatedFrame: 42, videoTimeSec: 1.4 })];
    const dup = findDuplicateEvent(existing, "Lt_Off", 1.4, 42);
    expect(dup).toBeNull();
  });
});
