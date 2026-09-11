import { useCallback, useState } from "react";
import { isValidStepTrialDraft, type StepSide, type StepTrial } from "../../domain/stepTrial";
import { videoToCsvTime } from "../../domain/sync";

export interface StepTrialDraft {
  side: StepSide;
  movementStartVideoTimeSec: number | null;
  icVideoTimeSec: number | null;
  movementEndVideoTimeSec: number | null;
}

const EMPTY_DRAFT: StepTrialDraft = {
  side: "Rt",
  movementStartVideoTimeSec: null,
  icVideoTimeSec: null,
  movementEndVideoTimeSec: null,
};

export interface StepTrialsState {
  trials: StepTrial[];
  draft: StepTrialDraft;
  setDraftSide: (side: StepSide) => void;
  captureMovementStart: (videoTimeSec: number) => void;
  captureIc: (videoTimeSec: number) => void;
  captureMovementEnd: (videoTimeSec: number) => void;
  clearMovementEnd: () => void;
  canCommitDraft: boolean;
  commitDraft: () => void;
  deleteTrial: (id: string) => void;
  replaceTrials: (trials: StepTrial[]) => void;
}

/** 要件定義書14.1：ステップ動作の登録（側・動作開始・ステップ側IC・任意の動作終了）。 */
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
    canCommitDraft,
    commitDraft,
    deleteTrial,
    replaceTrials,
  };
}
