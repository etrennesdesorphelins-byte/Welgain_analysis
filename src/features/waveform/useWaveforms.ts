import { useMemo } from "react";
import { toRelativeSeconds, type ColumnMapping, type ParsedCsv } from "../../domain/csv";
import type { GaitEvent } from "../../domain/events";
import { findIcToIcCycles, type CycleSide } from "../../domain/gaitCycles";
import {
  computeWaveformAverage,
  normalizeCycleToPoints,
  type WaveformPointStatistics,
} from "../../domain/waveform";

export type WaveformJoint = "hip" | "knee";

export interface JointCycleWaveform {
  side: CycleSide;
  startVideoTimeSec: number;
  endVideoTimeSec: number;
  points: (number | null)[];
}

export interface JointWaveformResult {
  cycles: JointCycleWaveform[];
  average: WaveformPointStatistics[];
}

type BySide<T> = Record<CycleSide, T>;
type ByJoint<T> = Record<WaveformJoint, T>;

export interface WaveformsState {
  csvTimes: number[];
  rawValues: ByJoint<BySide<number[]>>;
  normalized: ByJoint<BySide<JointWaveformResult>>;
  isConfigIncomplete: boolean;
}

function emptyJointResult(): JointWaveformResult {
  return { cycles: [], average: [] };
}

function emptyState(isConfigIncomplete: boolean): WaveformsState {
  return {
    csvTimes: [],
    rawValues: { hip: { Rt: [], Lt: [] }, knee: { Rt: [], Lt: [] } },
    normalized: {
      hip: { Rt: emptyJointResult(), Lt: emptyJointResult() },
      knee: { Rt: emptyJointResult(), Lt: emptyJointResult() },
    },
    isConfigIncomplete,
  };
}

/**
 * 要件定義書12章：同側IC間を1歩行周期とし、股・膝関節角度を101点へ正規化した波形を算出する。
 * CSVの`RightHip.Angle`等はOpenCap側で算出済みの列をそのまま使用する（formulas.md第1章）。
 */
export function useWaveforms(
  parsed: ParsedCsv | null,
  mapping: ColumnMapping | null,
  events: GaitEvent[],
): WaveformsState {
  return useMemo(() => {
    if (!parsed || !mapping) return emptyState(true);
    const { time, rightHipAngle, leftHipAngle, rightKneeAngle, leftKneeAngle } = mapping;
    if (!time || !rightHipAngle || !leftHipAngle || !rightKneeAngle || !leftKneeAngle) {
      return emptyState(true);
    }

    const rawTimes = parsed.rows.map((r) => Number.parseFloat(r[time]));
    const csvTimes = toRelativeSeconds(rawTimes);

    const columnValues = (header: string) => parsed.rows.map((r) => Number.parseFloat(r[header]));

    const rawValues: ByJoint<BySide<number[]>> = {
      hip: { Rt: columnValues(rightHipAngle), Lt: columnValues(leftHipAngle) },
      knee: { Rt: columnValues(rightKneeAngle), Lt: columnValues(leftKneeAngle) },
    };

    function buildJointResult(joint: WaveformJoint, side: CycleSide): JointWaveformResult {
      const icCycles = findIcToIcCycles(events, side);
      const values = rawValues[joint][side];
      const cycles: JointCycleWaveform[] = icCycles.map((cycle) => ({
        side,
        startVideoTimeSec: cycle.startEvent.videoTimeSec,
        endVideoTimeSec: cycle.endEvent.videoTimeSec,
        points: normalizeCycleToPoints(
          csvTimes,
          values,
          cycle.startEvent.csvTimeSec,
          cycle.endEvent.csvTimeSec,
        ),
      }));
      const average = computeWaveformAverage(cycles.map((c) => c.points));
      return { cycles, average };
    }

    return {
      csvTimes,
      rawValues,
      normalized: {
        hip: { Rt: buildJointResult("hip", "Rt"), Lt: buildJointResult("hip", "Lt") },
        knee: { Rt: buildJointResult("knee", "Rt"), Lt: buildJointResult("knee", "Lt") },
      },
      isConfigIncomplete: false,
    };
  }, [parsed, mapping, events]);
}
