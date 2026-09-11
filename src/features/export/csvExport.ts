import type { GaitEvent } from "../../domain/events";
import type { CycleSide, GaitPhaseTiming } from "../../domain/gaitCycles";
import { phaseTimingPercent } from "../../domain/gaitCycles";
import type { StrideRangeResultsState, StrideStepResult } from "../gait-analysis/useStrideRangeResults";
import type { StepResult } from "../step-analysis/useStepResults";

function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvText(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n");
}

/** 技術提案書13.1：UTF-8 BOM付きCSVを既定とし、日本語版Excelでの文字化けを抑える。 */
export function downloadCsv(fileName: string, csvText: string): void {
  const BOM = "﻿";
  const blob = new Blob([BOM + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 要件定義書15.2-1：イベント一覧CSV。 */
export function buildEventsCsv(events: GaitEvent[]): string {
  const sorted = [...events].sort((a, b) => a.videoTimeSec - b.videoTimeSec);
  return toCsvText(
    ["type", "video_time_sec", "estimated_frame", "csv_time_sec"],
    sorted.map((e) => [e.type, e.videoTimeSec, e.estimatedFrame ?? "", e.csvTimeSec]),
  );
}

/** 要件定義書9章改訂：検出ステップ歩幅一覧CSV（formulas.md第6〜7章の各値を保持）。 */
export function buildStrideResultsCsv(results: StrideStepResult[]): string {
  return toCsvText(
    [
      "side",
      "csv_time_sec",
      "estimated_video_time_sec",
      "signed_stride",
      "side_relative_stride",
      "absolute_stride",
      "pelvis_corrected_stride",
      "side_relative_pelvis_corrected_stride",
    ],
    results.map((r) => [
      r.side,
      r.csvTimeSec,
      r.videoTimeSec,
      r.signedStride,
      r.sideRelativeStride,
      r.absoluteStrideValue,
      r.pelvisCorrectedStride,
      r.sideRelativePelvisCorrectedStride,
    ]),
  );
}

/** 要件定義書15.2-3：左右別要約統計CSV。 */
export function buildSummaryStatsCsv(state: StrideRangeResultsState): string {
  const toRow = (
    variant: string,
    side: string,
    stats: StrideRangeResultsState["rightSummary"],
  ): (string | number)[] => [
    variant,
    side,
    stats.count,
    stats.max ?? "NA",
    stats.min ?? "NA",
    stats.mean ?? "NA",
    stats.sd ?? "NA",
  ];

  return toCsvText(["variant", "side", "count", "max", "min", "mean", "sd"], [
    toRow("no_pelvis_correction", "right", state.rightSummary),
    toRow("no_pelvis_correction", "left", state.leftSummary),
    toRow("with_pelvis_correction", "right", state.rightSummaryCorrected),
    toRow("with_pelvis_correction", "left", state.leftSummaryCorrected),
  ]);
}

/** 要件定義書11章：1歩行周期ごとの歩行相時間（秒・割合%）CSV。 */
export function buildGaitPhaseTimingCsv(
  rightTimings: GaitPhaseTiming[],
  leftTimings: GaitPhaseTiming[],
): string {
  const header = [
    "side",
    "cycle_index",
    "start_video_time_sec",
    "cycle_time_sec",
    "stance_time_sec",
    "stance_%",
    "swing_time_sec",
    "swing_%",
    "loading_response_sec",
    "loading_response_%",
    "single_support_sec",
    "single_support_%",
    "pre_swing_sec",
    "pre_swing_%",
    "double_support_sec",
    "double_support_%",
    "is_complete",
  ];

  const toRows = (side: CycleSide, timings: GaitPhaseTiming[]) =>
    timings.map((t, i): (string | number)[] => [
      side,
      i + 1,
      t.startEvent.videoTimeSec,
      t.cycleTimeSec,
      t.stanceTimeSec ?? "NA",
      phaseTimingPercent(t.stanceTimeSec, t.cycleTimeSec) ?? "NA",
      t.swingTimeSec ?? "NA",
      phaseTimingPercent(t.swingTimeSec, t.cycleTimeSec) ?? "NA",
      t.loadingResponseTimeSec ?? "NA",
      phaseTimingPercent(t.loadingResponseTimeSec, t.cycleTimeSec) ?? "NA",
      t.singleSupportTimeSec ?? "NA",
      phaseTimingPercent(t.singleSupportTimeSec, t.cycleTimeSec) ?? "NA",
      t.preSwingTimeSec ?? "NA",
      phaseTimingPercent(t.preSwingTimeSec, t.cycleTimeSec) ?? "NA",
      t.doubleSupportTimeSec ?? "NA",
      phaseTimingPercent(t.doubleSupportTimeSec, t.cycleTimeSec) ?? "NA",
      t.isComplete ? "true" : "false",
    ]);

  return toCsvText(header, [...toRows("Rt", rightTimings), ...toRows("Lt", leftTimings)]);
}

/** 要件定義書15.2-5：ステップ試行別結果CSV。 */
export function buildStepTrialsCsv(results: StepResult[]): string {
  return toCsvText(
    [
      "side",
      "step_time_sec",
      "movement_completion_time_sec",
      "signed_stride",
      "step_relative_stride",
      "absolute_stride",
      "pelvis_corrected_stride",
      "step_relative_pelvis_corrected_stride",
    ],
    results.map((r) => [
      r.side,
      r.stepTimeSec,
      r.movementCompletionTimeSec ?? "NA",
      r.signedStride,
      r.stepRelativeStride,
      r.absoluteStrideValue,
      r.pelvisCorrectedStride,
      r.stepRelativePelvisCorrectedStride,
    ]),
  );
}
