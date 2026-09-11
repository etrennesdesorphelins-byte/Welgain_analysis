import { describe, expect, it } from "vitest";
import { createEmptyColumnMapping } from "../domain/csv";
import { parseSavedState, SCHEMA_VERSION, type SavedAnalysisState } from "../domain/persistence";

function makeValidState(): SavedAnalysisState {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: "0.1.0",
    savedAtIso: new Date().toISOString(),
    subjectId: "S001",
    trialName: "comfortable",
    video: { fileName: "a.mp4", fileSizeBytes: 100, durationSec: 15, fps: 30, estimatedTotalFrames: 450 },
    csv: {
      fileName: "a.csv",
      fileSizeBytes: 200,
      encoding: "utf-8",
      rowCount: 305,
      startTimeSec: 0,
      endTimeSec: 15.2,
      estimatedSampleRateHz: 20,
      columnMapping: { ...createEmptyColumnMapping(), time: "UnixTime" },
      isTimeEstimated: false,
      assumedSampleRateHz: null,
    },
    bodyMeasurements: { thighLength: 52, shankLength: 49, pelvisWidth: 31, lengthUnit: "cm" },
    events: [{ id: "e1", type: "Rt_IC", videoTimeSec: 0, estimatedFrame: 0, csvTimeSec: 0 }],
    stepTrials: [],
    gaitSpeedInput: { measuredDistanceM: null, startTimeSec: null, endTimeSec: null },
    notes: { angleSignConvention: "x", interpolationMethod: "y", pelvisCorrectionNote: "z" },
  };
}

describe("parseSavedState", () => {
  it("有効な保存状態を正しくパースする（往復可能）", () => {
    const state = makeValidState();
    const result = parseSavedState(JSON.parse(JSON.stringify(state)));
    expect(result.success).toBe(true);
    expect(result.data).toEqual(state);
  });

  it("schemaVersionが異なる場合は明確なエラーを返す", () => {
    const state = { ...makeValidState(), schemaVersion: 999 };
    const result = parseSavedState(state);
    expect(result.success).toBe(false);
    expect(result.error).toContain("バージョン");
  });

  it("必須フィールドが欠けている場合はエラーを返す", () => {
    const result = parseSavedState({ foo: "bar" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("JSONの形式が不正です");
  });

  it("完全に無効な値（null等）はエラーを返す", () => {
    expect(parseSavedState(null).success).toBe(false);
    expect(parseSavedState("not an object").success).toBe(false);
  });
});
