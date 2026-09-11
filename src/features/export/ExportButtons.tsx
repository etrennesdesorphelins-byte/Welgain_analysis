import type { GaitEvent } from "../../domain/events";
import type { StrideResultsState } from "../gait-analysis/useStrideResults";
import type { GaitPhaseTimingState } from "../gait-phase-timing/useGaitPhaseTiming";
import type { StepResultsState } from "../step-analysis/useStepResults";
import {
  buildEventsCsv,
  buildGaitPhaseTimingCsv,
  buildStepTrialsCsv,
  buildStrideResultsCsv,
  buildSummaryStatsCsv,
  downloadCsv,
} from "./csvExport";
import { downloadCsvZip } from "./zipExport";

interface ExportButtonsProps {
  events: GaitEvent[];
  strideResults: StrideResultsState;
  gaitPhaseTiming: GaitPhaseTimingState;
  stepResults: StepResultsState;
  trialName: string;
}

/** 要件定義書15.2：イベント一覧・IC時歩幅・要約統計・歩行相時間・ステップ結果をCSV/ZIPで出力する。 */
export function ExportButtons({
  events,
  strideResults,
  gaitPhaseTiming,
  stepResults,
  trialName,
}: ExportButtonsProps) {
  const disabled = events.length === 0;
  const hasPhaseTiming =
    gaitPhaseTiming.rightTimings.length > 0 || gaitPhaseTiming.leftTimings.length > 0;
  const hasStepResults = stepResults.results.length > 0;

  async function handleZipExport() {
    const files = [
      { name: `${trialName}_events.csv`, content: buildEventsCsv(events) },
      ...(strideResults.results.length > 0
        ? [
            { name: `${trialName}_stride_results.csv`, content: buildStrideResultsCsv(strideResults.results) },
            { name: `${trialName}_summary_stats.csv`, content: buildSummaryStatsCsv(strideResults) },
          ]
        : []),
      ...(hasPhaseTiming
        ? [
            {
              name: `${trialName}_gait_cycles.csv`,
              content: buildGaitPhaseTimingCsv(gaitPhaseTiming.rightTimings, gaitPhaseTiming.leftTimings),
            },
          ]
        : []),
      ...(hasStepResults
        ? [{ name: `${trialName}_step_trials.csv`, content: buildStepTrialsCsv(stepResults.results) }]
        : []),
    ];
    await downloadCsvZip(`${trialName}_all_results.zip`, files);
  }

  return (
    <div className="export-buttons">
      <button
        type="button"
        disabled={disabled}
        onClick={() => downloadCsv(`${trialName}_events.csv`, buildEventsCsv(events))}
      >
        イベント一覧CSV
      </button>
      <button
        type="button"
        disabled={strideResults.results.length === 0}
        onClick={() =>
          downloadCsv(`${trialName}_stride_results.csv`, buildStrideResultsCsv(strideResults.results))
        }
      >
        IC時歩幅CSV
      </button>
      <button
        type="button"
        disabled={strideResults.results.length === 0}
        onClick={() => downloadCsv(`${trialName}_summary_stats.csv`, buildSummaryStatsCsv(strideResults))}
      >
        要約統計CSV
      </button>
      <button
        type="button"
        disabled={!hasPhaseTiming}
        onClick={() =>
          downloadCsv(
            `${trialName}_gait_cycles.csv`,
            buildGaitPhaseTimingCsv(gaitPhaseTiming.rightTimings, gaitPhaseTiming.leftTimings),
          )
        }
      >
        歩行相時間CSV
      </button>
      <button
        type="button"
        disabled={!hasStepResults}
        onClick={() => downloadCsv(`${trialName}_step_trials.csv`, buildStepTrialsCsv(stepResults.results))}
      >
        ステップ試行結果CSV
      </button>
      <button type="button" disabled={disabled} onClick={() => void handleZipExport()}>
        すべてZIPでまとめて出力
      </button>
    </div>
  );
}
