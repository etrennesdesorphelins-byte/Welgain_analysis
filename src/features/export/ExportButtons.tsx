import type { GaitEvent } from "../../domain/events";
import type { StrideRangeResultsState } from "../gait-analysis/useStrideRangeResults";
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

interface GaitExportButtonsProps {
  scope: "gait";
  events: GaitEvent[];
  strideResults: StrideRangeResultsState;
  gaitPhaseTiming: GaitPhaseTimingState;
  trialName: string;
}

interface StepExportButtonsProps {
  scope: "step";
  stepResults: StepResultsState;
  trialName: string;
}

type ExportButtonsProps = GaitExportButtonsProps | StepExportButtonsProps;

/** 要件定義書15.2：歩行解析／ステップ動作解析それぞれの結果をCSV/ZIPで出力する。 */
export function ExportButtons(props: ExportButtonsProps) {
  if (props.scope === "step") {
    const { stepResults, trialName } = props;
    const disabled = stepResults.results.length === 0;

    async function handleZipExport() {
      const files = [
        { name: `${trialName}_step_trials.csv`, content: buildStepTrialsCsv(stepResults.results) },
      ];
      await downloadCsvZip(`${trialName}_step_results.zip`, files);
    }

    return (
      <div className="export-buttons">
        <button
          type="button"
          disabled={disabled}
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

  const { events, strideResults, gaitPhaseTiming, trialName } = props;
  const disabled = events.length === 0;
  const hasStride = strideResults.results.length > 0;
  const hasPhaseTiming =
    gaitPhaseTiming.rightTimings.length > 0 || gaitPhaseTiming.leftTimings.length > 0;

  async function handleZipExport() {
    const files = [
      { name: `${trialName}_events.csv`, content: buildEventsCsv(events) },
      ...(hasStride
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
    ];
    await downloadCsvZip(`${trialName}_gait_results.zip`, files);
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
        disabled={!hasStride}
        onClick={() =>
          downloadCsv(`${trialName}_stride_results.csv`, buildStrideResultsCsv(strideResults.results))
        }
      >
        歩幅結果CSV
      </button>
      <button
        type="button"
        disabled={!hasStride}
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
      <button type="button" disabled={disabled} onClick={() => void handleZipExport()}>
        すべてZIPでまとめて出力
      </button>
    </div>
  );
}
