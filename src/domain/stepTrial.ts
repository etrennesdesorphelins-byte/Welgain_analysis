export type StepSide = "Rt" | "Lt";

export interface StepTrial {
  id: string;
  side: StepSide;
  movementStartVideoTimeSec: number;
  movementStartCsvTimeSec: number;
  icVideoTimeSec: number;
  icCsvTimeSec: number;
  movementEndVideoTimeSec: number | null;
  movementEndCsvTimeSec: number | null;
}

/** 要件定義書14.1：ステップ動作の登録項目のうち、動作開始とステップ側ICは必須。動作終了は任意。 */
export function isValidStepTrialDraft(draft: {
  side: StepSide | null;
  movementStartVideoTimeSec: number | null;
  icVideoTimeSec: number | null;
}): draft is { side: StepSide; movementStartVideoTimeSec: number; icVideoTimeSec: number } {
  return draft.side !== null && draft.movementStartVideoTimeSec !== null && draft.icVideoTimeSec !== null;
}

/** 要件定義書14.2：ステップ時間 = ステップ側IC − 動作開始。 */
export function stepTimeSec(trial: StepTrial): number {
  return trial.icVideoTimeSec - trial.movementStartVideoTimeSec;
}

/** 要件定義書14.2：動作完了時間 = 動作終了 − 動作開始（動作終了登録時のみ）。 */
export function movementCompletionTimeSec(trial: StepTrial): number | null {
  if (trial.movementEndVideoTimeSec === null) return null;
  return trial.movementEndVideoTimeSec - trial.movementStartVideoTimeSec;
}
