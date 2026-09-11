import { describe, expect, it } from "vitest";
import {
  isValidStepTrialDraft,
  movementCompletionTimeSec,
  stepTimeSec,
  type StepTrial,
} from "../domain/stepTrial";

function makeTrial(overrides: Partial<StepTrial> = {}): StepTrial {
  return {
    id: "t1",
    side: "Rt",
    movementStartVideoTimeSec: 1.0,
    movementStartCsvTimeSec: 1.0,
    icVideoTimeSec: 1.8,
    icCsvTimeSec: 1.8,
    movementEndVideoTimeSec: null,
    movementEndCsvTimeSec: null,
    ...overrides,
  };
}

describe("stepTimeSec", () => {
  it("ステップ側ICから動作開始を引いた時間を返す", () => {
    expect(stepTimeSec(makeTrial())).toBeCloseTo(0.8, 6);
  });
});

describe("movementCompletionTimeSec", () => {
  it("動作終了が未登録の場合はnull", () => {
    expect(movementCompletionTimeSec(makeTrial())).toBeNull();
  });

  it("動作終了が登録されている場合は動作開始からの時間を返す", () => {
    const trial = makeTrial({ movementEndVideoTimeSec: 2.5 });
    expect(movementCompletionTimeSec(trial)).toBeCloseTo(1.5, 6);
  });
});

describe("isValidStepTrialDraft", () => {
  it("側・動作開始・ステップ側ICが揃っていれば有効", () => {
    expect(
      isValidStepTrialDraft({ side: "Rt", movementStartVideoTimeSec: 1, icVideoTimeSec: 2 }),
    ).toBe(true);
  });

  it("いずれか欠けていれば無効", () => {
    expect(
      isValidStepTrialDraft({ side: null, movementStartVideoTimeSec: 1, icVideoTimeSec: 2 }),
    ).toBe(false);
    expect(
      isValidStepTrialDraft({ side: "Lt", movementStartVideoTimeSec: null, icVideoTimeSec: 2 }),
    ).toBe(false);
  });
});
