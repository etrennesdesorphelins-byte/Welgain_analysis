import type { CycleSide, GaitPhaseTiming } from "../../domain/gaitCycles";
import { phaseTimingPercent } from "../../domain/gaitCycles";
import type { GaitPhaseTimingState } from "./useGaitPhaseTiming";

function fmt(sec: number | null, cycleTimeSec: number): string {
  if (sec === null) return "NA";
  const pct = phaseTimingPercent(sec, cycleTimeSec);
  return `${sec.toFixed(2)}秒 (${pct === null ? "NA" : pct.toFixed(1) + "%"})`;
}

function TimingRows({ side, timings }: { side: CycleSide; timings: GaitPhaseTiming[] }) {
  return (
    <>
      {timings.map((t, i) => (
        <tr key={`${side}-${i}`}>
          <td>{side === "Rt" ? "右" : "左"}</td>
          <td>{i + 1}</td>
          <td>{t.startEvent.videoTimeSec.toFixed(2)}</td>
          <td>{t.cycleTimeSec.toFixed(2)}秒</td>
          <td>{fmt(t.stanceTimeSec, t.cycleTimeSec)}</td>
          <td>{fmt(t.swingTimeSec, t.cycleTimeSec)}</td>
          <td>{fmt(t.loadingResponseTimeSec, t.cycleTimeSec)}</td>
          <td>{fmt(t.singleSupportTimeSec, t.cycleTimeSec)}</td>
          <td>{fmt(t.preSwingTimeSec, t.cycleTimeSec)}</td>
          <td>{fmt(t.doubleSupportTimeSec, t.cycleTimeSec)}</td>
          <td>{t.isComplete ? "完全" : "不完全"}</td>
        </tr>
      ))}
    </>
  );
}

/** 要件定義書11章：歩行時間パラメータ（歩行相時間・割合）とケイデンスの表示。 */
export function GaitPhaseTimingPanel({ state }: { state: GaitPhaseTimingState }) {
  const hasAny = state.rightTimings.length > 0 || state.leftTimings.length > 0;

  return (
    <div>
      <h4>ケイデンス</h4>
      <p className="gait-phase-timing__cadence">
        {state.cadence.cadenceStepsPerMin !== null
          ? `${state.cadence.cadenceStepsPerMin.toFixed(1)} 歩/分`
          : "算出には2件以上のICが必要です"}
        <br />
        <span className="gait-phase-timing__cadence-method">
          （{state.cadence.method}／歩数{state.cadence.stepCount}、経過時間{state.cadence.durationSec.toFixed(2)}秒）
        </span>
      </p>

      <h4>歩行相時間</h4>
      {!hasAny ? (
        <p className="gait-phase-timing__empty">
          同側ICが2件以上登録されると、歩行周期ごとの歩行相時間を表示します。
        </p>
      ) : (
        <div className="table-scroll">
          <table className="event-list-table">
            <thead>
              <tr>
                <th>側</th>
                <th>周期#</th>
                <th>開始時刻</th>
                <th>一歩行周期</th>
                <th>立脚</th>
                <th>遊脚</th>
                <th>荷重応答期</th>
                <th>単脚支持期</th>
                <th>前遊脚期</th>
                <th>両脚支持</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              <TimingRows side="Rt" timings={state.rightTimings} />
              <TimingRows side="Lt" timings={state.leftTimings} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
