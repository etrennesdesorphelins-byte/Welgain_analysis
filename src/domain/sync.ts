export type SyncWarningLevel = "none" | "notice" | "strong";

export interface VideoToCsvTimeResult {
  csvTimeSec: number;
  wasClamped: boolean;
}

/**
 * 要件定義書7.1：動画全体の0〜100%とCSV全体の0〜100%を対応させる比例同期。
 * t_CSV = (t_video / T_video) × T_CSV
 * 範囲外になった場合は0〜CSV終了時刻へクランプする（技術提案書8章）。
 */
export function videoToCsvTime(
  videoTimeSec: number,
  videoDurationSec: number,
  csvDurationSec: number,
): VideoToCsvTimeResult {
  const ratio = videoDurationSec > 0 ? videoTimeSec / videoDurationSec : 0;
  const raw = ratio * csvDurationSec;
  const csvTimeSec = Math.min(Math.max(raw, 0), csvDurationSec);
  return { csvTimeSec, wasClamped: csvTimeSec !== raw };
}

/**
 * videoToCsvTimeの逆写像。歩幅波形上で検出したステップのCSV時刻から、
 * 対応するおおよその動画時刻を求める（比例同期、要件定義書7.1）。
 */
export function csvToVideoTime(
  csvTimeSec: number,
  videoDurationSec: number,
  csvDurationSec: number,
): number {
  const ratio = csvDurationSec > 0 ? csvTimeSec / csvDurationSec : 0;
  const raw = ratio * videoDurationSec;
  return Math.min(Math.max(raw, 0), videoDurationSec);
}

export interface SyncDurationDifference {
  diffSec: number;
  diffRatio: number;
  level: SyncWarningLevel;
}

const NOTICE_ABS_SEC = 0.2;
const NOTICE_RATIO = 0.02;
const STRONG_ABS_SEC = 1.0;
const STRONG_RATIO = 0.1;

/**
 * 要件定義書7.3：動画長とCSV長の差に基づく警告の暫定基準。
 * 0.2秒超または全体時間の2%超で「時間比率補正を使用」表示、
 * 1.0秒超または全体時間の10%超で強い警告。
 */
export function evaluateSyncDurationDifference(
  videoDurationSec: number,
  csvDurationSec: number,
): SyncDurationDifference {
  const diffSec = Math.abs(videoDurationSec - csvDurationSec);
  const maxDuration = Math.max(videoDurationSec, csvDurationSec, Number.EPSILON);
  const diffRatio = diffSec / maxDuration;

  let level: SyncWarningLevel = "none";
  if (diffSec > STRONG_ABS_SEC || diffRatio > STRONG_RATIO) {
    level = "strong";
  } else if (diffSec > NOTICE_ABS_SEC || diffRatio > NOTICE_RATIO) {
    level = "notice";
  }

  return { diffSec, diffRatio, level };
}
