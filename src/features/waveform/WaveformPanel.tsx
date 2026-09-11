import { useState } from "react";
import type { GaitEvent } from "../../domain/events";
import { WaveformChart } from "./WaveformChart";
import { RawWaveformChart } from "./RawWaveformChart";
import { SIDE_COLOR, SIDE_DASH, SIDE_LABEL } from "./chartConstants";
import type { WaveformJoint, WaveformsState } from "./useWaveforms";

const SIDES = ["Rt", "Lt"] as const;

const JOINT_LABEL: Record<WaveformJoint, string> = { hip: "股関節角度", knee: "膝関節角度" };

interface WaveformPanelProps {
  state: WaveformsState;
  events: GaitEvent[];
}

/** 要件定義書12章：股・膝関節角度波形（個別・平均±SD、正規化／元時間波形の切替）。 */
export function WaveformPanel({ state, events }: WaveformPanelProps) {
  const [joint, setJoint] = useState<WaveformJoint>("hip");
  const [mode, setMode] = useState<"normalized" | "raw">("normalized");
  const [showIndividualCycles, setShowIndividualCycles] = useState(true);
  const [showSd, setShowSd] = useState(true);

  if (state.isConfigIncomplete) {
    return (
      <p className="waveform-panel__empty">
        波形を表示するには、CSV列割当（股・膝関節角度、時刻）をすべて入力してください。
      </p>
    );
  }

  return (
    <div className="waveform-panel">
      <div className="waveform-panel__controls">
        <label>
          関節
          <select value={joint} onChange={(e) => setJoint(e.target.value as WaveformJoint)}>
            <option value="hip">股関節</option>
            <option value="knee">膝関節</option>
          </select>
        </label>
        <label>
          表示
          <select value={mode} onChange={(e) => setMode(e.target.value as "normalized" | "raw")}>
            <option value="normalized">正規化（0〜100%）</option>
            <option value="raw">元時間波形</option>
          </select>
        </label>
        {mode === "normalized" && (
          <>
            <label className="waveform-panel__checkbox">
              <input
                type="checkbox"
                checked={showIndividualCycles}
                onChange={(e) => setShowIndividualCycles(e.target.checked)}
              />
              個別周期を表示
            </label>
            <label className="waveform-panel__checkbox">
              <input type="checkbox" checked={showSd} onChange={(e) => setShowSd(e.target.checked)} />
              平均±SD帯を表示
            </label>
          </>
        )}
      </div>

      {mode === "normalized" ? (
        <WaveformChart
          title={JOINT_LABEL[joint]}
          data={state.normalized[joint]}
          showIndividualCycles={showIndividualCycles}
          showSd={showSd}
        />
      ) : (
        <RawWaveformChart
          title={JOINT_LABEL[joint]}
          csvTimes={state.csvTimes}
          unit="°"
          events={events}
          series={SIDES.map((side) => ({
            key: side,
            label: SIDE_LABEL[side],
            color: SIDE_COLOR[side],
            dash: SIDE_DASH[side],
            values: state.rawValues[joint][side],
          }))}
        />
      )}
    </div>
  );
}
