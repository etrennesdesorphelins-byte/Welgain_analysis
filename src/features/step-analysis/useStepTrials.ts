import { useCallback, useState } from "react";
import { isValidStepTrialDraft, type StepSide, type StepTrial } from "../../domain/stepTrial";
import { videoToCsvTime } from "../../domain/sync";

export interface StepTrialDraft {
  side: StepSide;
  movementStartVideoTimeSec: number | null;
  /** ステップ幅最大値の時刻。 */
  icVideoTimeSec: number | null;
  movementEndVideoTimeSec: number | null;
  footOffVideoTimeSec: number | null;
  footIcVideoTimeSec: number | null;
}

const EMPTY_DRAFT: StepTrialDraft = {
  side: "Rt",
  movementStartVideoTimeSec: null,
  icVideoTimeSec: null,
  movementEndVideoTimeSec: null,
  footOffVideoTimeSec: null,
  footIcVideoTimeSec: null,
};

export interface StepTrialsState {
  trials: StepTrial[];
  draft: StepTrialDraft;
  setDraftSide: (side: StepSide) => void;
  captureMovementStart: (videoTimeSec: number) => void;
  captureIc: (videoTimeSec: number) => void;
  captureMovementEnd: (videoTimeSec: number) => void;
  clearMovementEnd: () => void;
  captureFootOff: (videoTimeSec: number) => void;
  clearFootOff: () => void;
  captureFootIc: (videoTimeSec: number) => void;
  clearFootIc: () => void;
  canCommitDraft: boolean;
  commitDraft: () => void;
  deleteTrial: (id: string) => void;
  replaceTrials: (trials: StepTrial[]) => void;
}

/**
 * 要件定義書14.1：ステップ動作の登録（側・動作開始・ステップ幅最大値・任意の動作終了）。
 * 遊脚時間算出用に、任意項目として足部離床・足部ICも動画から直接記録できる。
 */
export function useStepTrials(
  videoDurationSec: number | null,
  csvDurationSec: number | null,
): StepTrialsState {
  const [trials, setTrials] = useState<StepTrial[]>([]);
  const [draft, setDraft] = useState<StepTrialDraft>(EMPTY_DRAFT);

  const setDraftSide = useCallback((side: StepSide) => {
    setDraft((d) => ({ ...d, side }));
  }, []);

  const captureMovementStart = useCallback((videoTimeSec: number) => {
    setDraft((d) => ({ ...d, movementStartVideoTimeSec: videoTimeSec }));
  }, []);

  const captureIc = useCallback((videoTimeSec: number) => {
    setDraft((d) => ({ ...d, icVideoTimeSec: videoTimeSec }));
  }, []);

  const captureMovementEnd = useCallback((videoTimeSec: number) => {
    setDraft((d) => ({ ...d, movementEndVideoTimeSec: videoTimeSec }));
  }, []);

  const clearMovementEnd = useCallback(() => {
    setDraft((d) => ({ ...d, movementEndVideoTimeSec: null }));
  }, []);

  const captureFootOff = useCallback((videoTimeSec: number) => {
    setDraft((d) => ({ ...d, footOffVideoTimeSec: videoTimeSec }));
  }, []);

  const clearFootOff = useCallback(() => {
    setDraft((d) => ({ ...d, footOffVideoTimeSec: null }));
  }, []);

  const captureFootIc = useCallback((videoTimeSec: number) => {
    setDraft((d) => ({ ...d, footIcVideoTimeSec: videoTimeSec }));
  }, []);

  const clearFootIc = useCallback(() => {
    setDraft((d) => ({ ...d, footIcVideoTimeSec: null }));
  }, []);

  const canCommitDraft = isValidStepTrialDraft(draft);

  const toCsvTime = useCallback(
    (videoTimeSec: number) =>
      videoDurationSec !== null && csvDurationSec !== null
        ? videoToCsvTime(videoTimeSec, videoDurationSec, csvDurationSec).csvTimeSec
        : 0,
    [videoDurationSec, csvDurationSec],
  );

  const commitDraft = useCallback(() => {
    if (!isValidStepTrialDraft(draft)) return;
    const trial: StepTrial = {
      id: crypto.randomUUID(),
      side: draft.side,
      movementStartVideoTimeSec: draft.movementStartVideoTimeSec,
      movementStartCsvTimeSec: toCsvTime(draft.movementStartVideoTimeSec),
      icVideoTimeSec: draft.icVideoTimeSec,
      icCsvTimeSec: toCsvTime(draft.icVideoTimeSec),
      movementEndVideoTimeSec: draft.movementEndVideoTimeSec,
      movementEndCsvTimeSec:
        draft.movementEndVideoTimeSec !== null ? toCsvTime(draft.movementEndVideoTimeSec) : null,
      footOffVideoTimeSec: draft.footOffVideoTimeSec,
      footOffCsvTimeSec: draft.footOffVideoTimeSec !== null ? toCsvTime(draft.footOffVideoTimeSec) : null,
      footIcVideoTimeSec: draft.footIcVideoTimeSec,
      footIcCsvTimeSec: draft.footIcVideoTimeSec !== null ? toCsvTime(draft.footIcVideoTimeSec) : null,
    };
    setTrials((prev) => [...prev, trial]);
    setDraft({ ...EMPTY_DRAFT, side: draft.side });
  }, [draft, toCsvTime]);

  const deleteTrial = useCallback((id: string) => {
    setTrials((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const replaceTrials = useCallback((next: StepTrial[]) => {
    setTrials(next);
  }, []);

  return {
    trials,
    draft,
    setDraftSide,
    captureMovementStart,
    captureIc,
    captureMovementEnd,
    clearMovementEnd,
    captureFootOff,
    clearFootOff,
    captureFootIc,
    clearFootIc,
    canCommitDraft,
    commitDraft,
    deleteTrial,
    replaceTrials,
  };
}
