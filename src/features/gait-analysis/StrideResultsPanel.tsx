import type { SummaryStatistics } from "../../domain/statistics";
import type { StrideRangeResultsState } from "./useStrideRangeResults";

function fmt(v: number | null, digits = 2): string {
  return v === null ? "NA" : v.toFixed(digits);
}

function SummaryTable({
  title,
  right,
  left,
  signedDiff,
  absDiff,
}: {
  title: string;
  right: SummaryStatistics;
  left: SummaryStatistics;
  signedDiff: number | null;
  absDiff: number | null;
}) {
  return (
    <div className="stride-summary-table">
      <h4>{title}</h4>
      <table className="event-list-table">
        <thead>
          <tr>
            <th>側</th>
            <th>件数</th>
            <th>最大</th>
            <th>最小</th>
            <th>平均</th>
            <th>SD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>右</td>
            <td>{right.count}</td>
            <td>{fmt(right.max)}</td>
            <td>{fmt(right.min)}</td>
            <td>{fmt(right.mean)}</td>
            <td>{fmt(right.sd)}</td>
          </tr>
          <tr>
            <td>左</td>
            <td>{left.count}</td>
            <td>{fmt(left.max)}</td>
            <td>{fmt(left.min)}</td>
            <td>{fmt(left.mean)}</td>
            <td>{fmt(left.sd)}</td>
          </tr>
        </tbody>
      </table>
      <p className="stride-summary-table__diff">
        符号付き左右差: {fmt(signedDiff)} ／ 左右差絶対値: {fmt(absDiff)}
      </p>
    </div>
  );
}

/** 要件定義書9章改訂：歩幅波形の範囲選択から検出したステップ歩幅一覧・左右別要約統計の表示。 */
export function StrideResultsPanel({ state }: { state: StrideRangeResultsState }) {
  if (state.isConfigIncomplete) {
    return (
      <p className="stride-results-panel__empty">
        歩幅を算出するには、CSV列割当（大腿・下腿・骨盤角度、時刻）と身体計測値をすべて入力してください。
      </p>
    );
  }

  if (!state.hasSelection) {
    return (
      <p className="stride-results-panel__empty">
        下の歩幅波形をドラッグして範囲を選択すると、その範囲内のステップ歩幅を自動検出します。
      </p>
    );
  }

  if (state.results.length === 0) {
    return (
      <p className="stride-results-panel__empty">
        選択した範囲内に極大・極小点（ステップ）が見つかりませんでした。範囲を広げてください。
      </p>
    );
  }

  return (
    <div>
      <h4>検出ステップ歩幅一覧</h4>
      <table className="event-list-table">
        <thead>
          <tr>
            <th>側</th>
            <th>CSV時刻(秒)</th>
            <th>動画時刻(推定)</th>
            <th>元の符号付き歩幅</th>
            <th>側基準歩幅</th>
            <th>絶対歩幅</th>
            <th>骨盤補正あり歩幅</th>
            <th>側基準（補正あり）</th>
          </tr>
        </thead>
        <tbody>
          {state.results.map((r) => (
            <tr key={r.index}>
              <td>{r.side === "Rt" ? "右" : "左"}</td>
              <td>{r.csvTimeSec.toFixed(2)}</td>
              <td>{r.videoTimeSec.toFixed(2)}</td>
              <td>{fmt(r.signedStride)}</td>
              <td>{fmt(r.sideRelativeStride)}</td>
              <td>{fmt(r.absoluteStrideValue)}</td>
              <td>{fmt(r.pelvisCorrectedStride)}</td>
              <td>{fmt(r.sideRelativePelvisCorrectedStride)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SummaryTable
        title="左右別要約統計（骨盤補正なし）"
        right={state.rightSummary}
        left={state.leftSummary}
        signedDiff={state.signedDifference}
        absDiff={state.absoluteDifference}
      />
      <SummaryTable
        title="左右別要約統計（骨盤補正あり）"
        right={state.rightSummaryCorrected}
        left={state.leftSummaryCorrected}
        signedDiff={state.signedDifferenceCorrected}
        absDiff={state.absoluteDifferenceCorrected}
      />
    </div>
  );
}
