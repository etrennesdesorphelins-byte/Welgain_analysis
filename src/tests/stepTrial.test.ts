import { describe, expect, it } from "vitest";
import {
  isValidStepTrialDraft,
  movementCompletionTimeSec,
  stepTimeSec,
  swingTimeSec,
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
    footOffVideoTimeSec: null,
    footOffCsvTimeSec: null,
    footIcVideoTimeSec: null,
    footIcCsvTimeSec: null,
    ...overrides,
  };
}

describe("stepTimeSec", () => {
  it("ステップ幅最大値から動作開始を引いた時間を返す", () => {
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

describe("swingTimeSec", () => {
  it("足部離床・足部ICのいずれかが未登録の場合はnull", () => {
    expect(swingTimeSec(makeTrial())).toBeNull();
    expect(swingTimeSec(makeTrial({ footOffVideoTimeSec: 1.2 }))).toBeNull();
    expect(swingTimeSec(makeTrial({ footIcVideoTimeSec: 1.6 }))).toBeNull();
  });

  it("足部離床・足部ICが両方登録されている場合はその差を返す", () => {
    const trial = makeTrial({ footOffVideoTimeSec: 1.2, footIcVideoTimeSec: 1.6 });
    expect(swingTimeSec(trial)).toBeCloseTo(0.4, 6);
  });
});

describe("isValidStepTrialDraft", () => {
  it("側・動作開始・ステップ幅最大値が揃っていれば有効", () => {
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
