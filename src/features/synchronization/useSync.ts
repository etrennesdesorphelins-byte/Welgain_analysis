import { useMemo } from "react";
import { evaluateSyncDurationDifference, videoToCsvTime, type SyncDurationDifference } from "../../domain/sync";

export interface SyncState {
  toCsvTime: (videoTimeSec: number) => number;
  durationDiff: SyncDurationDifference | null;
  videoDurationSec: number | null;
  csvDurationSec: number | null;
}

/** 要件定義書7章：比例同期と、動画長・CSV長の差に基づく警告レベルを提供する。 */
export function useSync(
  videoDurationSec: number | null,
  csvDurationSec: number | null,
): SyncState {
  const durationDiff = useMemo(() => {
    if (videoDurationSec === null || csvDurationSec === null) return null;
    return evaluateSyncDurationDifference(videoDurationSec, csvDurationSec);
  }, [videoDurationSec, csvDurationSec]);

  return useMemo(
    () => ({
      toCsvTime: (videoTimeSec: number) => {
        if (videoDurationSec === null || csvDurationSec === null) return 0;
        return videoToCsvTime(videoTimeSec, videoDurationSec, csvDurationSec).csvTimeSec;
      },
      durationDiff,
      videoDurationSec,
      csvDurationSec,
    }),
    [videoDurationSec, csvDurationSec, durationDiff],
  );
}
