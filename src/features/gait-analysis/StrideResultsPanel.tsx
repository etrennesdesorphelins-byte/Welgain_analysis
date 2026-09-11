import type { SummaryStatistics } from "../../domain/statistics";
import type { StrideResultsState } from "./useStrideResults";

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

/** 要件定義書9章：IC時歩幅一覧・左右別要約統計の表示。 */
export function StrideResultsPanel({ state }: { state: StrideResultsState }) {
  if (state.isConfigIncomplete) {
    return (
      <p className="stride-results-panel__empty">
        歩幅を算出するには、CSV列割当（大腿・下腿・骨盤角度、時刻）と身体計測値をすべて入力してください。
      </p>
    );
  }

  if (state.results.length === 0 && state.missing.length === 0) {
    return <p className="stride-results-panel__empty">Rt_IC・Lt_ICイベントを登録すると歩幅を算出します。</p>;
  }

  return (
    <div>
      <h4>IC時歩幅一覧</h4>
      <table className="event-list-table">
        <thead>
          <tr>
            <th>種類</th>
            <th>動画時刻</th>
            <th>元の符号付き歩幅</th>
            <th>IC側基準歩幅</th>
            <th>絶対歩幅</th>
            <th>骨盤補正あり歩幅</th>
            <th>IC側基準（補正あり）</th>
            <th>補間</th>
          </tr>
        </thead>
        <tbody>
          {state.results.map((r) => (
            <tr key={r.eventId}>
              <td>{r.eventType}</td>
              <td>{r.videoTimeSec.toFixed(2)}</td>
              <td>{fmt(r.signedStride)}</td>
              <td>{fmt(r.icRelativeStride)}</td>
              <td>{fmt(r.absoluteStrideValue)}</td>
              <td>{fmt(r.pelvisCorrectedStride)}</td>
              <td>{fmt(r.icRelativePelvisCorrectedStride)}</td>
              <td>{r.isInterpolated ? "補間値" : "実測点"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {state.missing.length > 0 && (
        <ul className="validation-issue-list">
          {state.missing.map((m) => (
            <li key={m.eventId} className="validation-issue validation-issue--warning">
              <span className="validation-issue__badge">警告</span>
              {m.eventType}: {m.reason}
            </li>
          ))}
        </ul>
      )}

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
