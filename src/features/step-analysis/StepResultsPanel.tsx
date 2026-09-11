import type { StepTrial } from "../../domain/stepTrial";
import type { StepTrialsState } from "./useStepTrials";
import type { StepResultsState } from "./useStepResults";

function fmt(v: number | null, digits = 2): string {
  return v === null ? "NA" : v.toFixed(digits);
}

const SIDE_LABEL: Record<StepTrial["side"], string> = { Rt: "右", Lt: "左" };

interface StepResultsPanelProps {
  trialsState: StepTrialsState;
  resultsState: StepResultsState;
}

/** 要件定義書14章：ステップ試行の一覧・算出結果・複数試行の要約統計。 */
export function StepResultsPanel({ trialsState, resultsState }: StepResultsPanelProps) {
  if (trialsState.trials.length === 0) {
    return <p className="step-results-panel__empty">ステップ試行が登録されていません。</p>;
  }

  const resultByTrialId = new Map(resultsState.results.map((r) => [r.trialId, r]));

  return (
    <div>
      <table className="event-list-table">
        <thead>
          <tr>
            <th>側</th>
            <th>動作開始</th>
            <th>ステップ側IC</th>
            <th>動作終了</th>
            <th>ステップ時間</th>
            <th>動作完了時間</th>
            <th>ステップ側基準歩幅</th>
            <th>絶対歩幅</th>
            <th>骨盤補正あり</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trialsState.trials.map((trial) => {
            const r = resultByTrialId.get(trial.id);
            return (
              <tr key={trial.id}>
                <td>{SIDE_LABEL[trial.side]}</td>
                <td>{trial.movementStartVideoTimeSec.toFixed(2)}</td>
                <td>{trial.icVideoTimeSec.toFixed(2)}</td>
                <td>{trial.movementEndVideoTimeSec !== null ? trial.movementEndVideoTimeSec.toFixed(2) : "—"}</td>
                <td>{r ? fmt(r.stepTimeSec) : "—"}秒</td>
                <td>{r ? fmt(r.movementCompletionTimeSec) : "—"}</td>
                <td>{r ? fmt(r.stepRelativeStride) : "算出不可"}</td>
                <td>{r ? fmt(r.absoluteStrideValue) : "—"}</td>
                <td>{r ? fmt(r.stepRelativePelvisCorrectedStride) : "—"}</td>
                <td>
                  <button type="button" onClick={() => trialsState.deleteTrial(trial.id)}>
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {resultsState.missing.length > 0 && (
        <ul className="validation-issue-list">
          {resultsState.missing.map((m) => (
            <li key={m.trialId} className="validation-issue validation-issue--warning">
              <span className="validation-issue__badge">警告</span>
              {m.reason}
            </li>
          ))}
        </ul>
      )}

      <p className="step-results-panel__summary">
        ステップ時間：件数{resultsState.stepTimeSummary.count} 最大{fmt(resultsState.stepTimeSummary.max)} 最小
        {fmt(resultsState.stepTimeSummary.min)} 平均{fmt(resultsState.stepTimeSummary.mean)} SD
        {fmt(resultsState.stepTimeSummary.sd)}
        <br />
        ステップ側基準歩幅：件数{resultsState.strideSummary.count} 最大{fmt(resultsState.strideSummary.max)} 最小
        {fmt(resultsState.strideSummary.min)} 平均{fmt(resultsState.strideSummary.mean)} SD
        {fmt(resultsState.strideSummary.sd)}
      </p>
    </div>
  );
}
