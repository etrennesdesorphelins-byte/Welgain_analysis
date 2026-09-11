import { interpolateAtTime } from "./interpolation";
import { computeSummaryStatistics } from "./statistics";

export const WAVEFORM_POINT_COUNT = 101;

/** 要件定義書12章：周期を0〜100%のpointCount点へ線形補間する（既定101点）。 */
export function normalizeCycleToPoints(
  csvTimes: number[],
  values: number[],
  startCsvTimeSec: number,
  endCsvTimeSec: number,
  pointCount: number = WAVEFORM_POINT_COUNT,
): (number | null)[] {
  const points: (number | null)[] = [];
  for (let i = 0; i < pointCount; i++) {
    const t = startCsvTimeSec + ((endCsvTimeSec - startCsvTimeSec) * i) / (pointCount - 1);
    const interp = interpolateAtTime(csvTimes, values, t);
    points.push(interp ? interp.value : null);
  }
  return points;
}

export interface WaveformPointStatistics {
  mean: number | null;
  sd: number | null;
  validCount: number;
}

/**
 * 要件定義書12章：複数周期の正規化波形について、各正規化点の平均・標本標準偏差を算出する。
 * 有効周期数が1点のみの場合、標準偏差はNA（null）。
 */
export function computeWaveformAverage(cycles: (number | null)[][]): WaveformPointStatistics[] {
  if (cycles.length === 0) return [];
  const pointCount = cycles[0].length;
  const result: WaveformPointStatistics[] = [];
  for (let i = 0; i < pointCount; i++) {
    const valuesAtPoint = cycles
      .map((cycle) => cycle[i])
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const stats = computeSummaryStatistics(valuesAtPoint);
    result.push({ mean: stats.mean, sd: stats.sd, validCount: stats.count });
  }
  return result;
}
