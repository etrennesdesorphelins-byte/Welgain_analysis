export type StepSide = "Rt" | "Lt";

export interface StepTrial {
  id: string;
  side: StepSide;
  movementStartVideoTimeSec: number;
  movementStartCsvTimeSec: number;
  /** ステップ幅最大値（歩幅波形の最大変化点）の時刻。 */
  icVideoTimeSec: number;
  icCsvTimeSec: number;
  movementEndVideoTimeSec: number | null;
  movementEndCsvTimeSec: number | null;
  /** 足部離床（遊脚開始）。動画から直接選択する任意項目。 */
  footOffVideoTimeSec: number | null;
  footOffCsvTimeSec: number | null;
  /** 足部IC（遊脚終了）。動画から直接選択する任意項目。 */
  footIcVideoTimeSec: number | null;
  footIcCsvTimeSec: number | null;
}

/** 要件定義書14.1：ステップ動作の登録項目のうち、動作開始とステップ幅最大値は必須。それ以外は任意。 */
export function isValidStepTrialDraft(draft: {
  side: StepSide | null;
  movementStartVideoTimeSec: number | null;
  icVideoTimeSec: number | null;
}): draft is { side: StepSide; movementStartVideoTimeSec: number; icVideoTimeSec: number } {
  return draft.side !== null && draft.movementStartVideoTimeSec !== null && draft.icVideoTimeSec !== null;
}

/** 要件定義書14.2：ステップ時間 = ステップ幅最大値 − 動作開始。 */
export function stepTimeSec(trial: StepTrial): number {
  return trial.icVideoTimeSec - trial.movementStartVideoTimeSec;
}

/** 要件定義書14.2：動作完了時間 = 動作終了 − 動作開始（動作終了登録時のみ）。 */
export function movementCompletionTimeSec(trial: StepTrial): number | null {
  if (trial.movementEndVideoTimeSec === null) return null;
  return trial.movementEndVideoTimeSec - trial.movementStartVideoTimeSec;
}

/** 遊脚時間 = 足部IC − 足部離床（両方登録済みの場合のみ）。 */
export function swingTimeSec(trial: StepTrial): number | null {
  if (trial.footOffVideoTimeSec === null || trial.footIcVideoTimeSec === null) return null;
  return trial.footIcVideoTimeSec - trial.footOffVideoTimeSec;
}
