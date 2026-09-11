import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeContinuousStride } from "../domain/strideWaveform";

/**
 * Phase 0で既存Excelから転記した基準値に対し、連続歩幅波形の算出が
 * 許容誤差内で一致することを検証する回帰テスト（docs/validation.md参照）。
 */

const TEST_DATA_DIR = path.join(process.cwd(), "src", "test-data");

function readCsvRows(fileName: string): Record<string, string>[] {
  const text = readFileSync(path.join(TEST_DATA_DIR, fileName), "utf-8");
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i]));
    return row;
  });
}

const bodyMeasurements = JSON.parse(
  readFileSync(path.join(TEST_DATA_DIR, "subject01_body_measurements.json"), "utf-8"),
) as { thighLength: number; shankLength: number; pelvisWidth: number };

const rawRows = readCsvRows("subject01_raw.csv");
const expectedRows = readCsvRows("subject01_expected_segment_values.csv");

const ABS_TOLERANCE = 1e-6;

describe("computeContinuousStride vs 既存Excel基準値", () => {
  const rightThighY = rawRows.map((r) => Number(r["RightThigh.Single.Euler.y"]));
  const leftThighY = rawRows.map((r) => Number(r["LeftThigh.Single.Euler.y"]));
  const rightShankY = rawRows.map((r) => Number(r["RightLowerLeg.Single.Euler.y"]));
  const leftShankY = rawRows.map((r) => Number(r["LeftLowerLeg.Single.Euler.y"]));
  const lowerBackX = rawRows.map((r) => Number(r["LowerBack.Single.Euler.x"]));

  const { rawStride, pelvisCorrectedStride } = computeContinuousStride(
    rightThighY,
    leftThighY,
    rightShankY,
    leftShankY,
    lowerBackX,
    bodyMeasurements.thighLength,
    bodyMeasurements.shankLength,
    bodyMeasurements.pelvisWidth,
  );

  it.each(expectedRows)("row_index=$row_index が許容誤差内で一致する", (expectedRow) => {
    const rowIndex = Number(expectedRow.row_index);
    const i = rowIndex - 2; // Excel行2 = rawRowsの配列index 0

    const diffRaw = Math.abs(rawStride[i] - Number(expectedRow.stride_no_pelvis_AQ));
    expect(diffRaw, `stride_no_pelvis_AQ row=${rowIndex}`).toBeLessThan(ABS_TOLERANCE);

    const diffCorrected = Math.abs(
      pelvisCorrectedStride[i] - Number(expectedRow.stride_with_pelvis_AR),
    );
    expect(diffCorrected, `stride_with_pelvis_AR row=${rowIndex}`).toBeLessThan(ABS_TOLERANCE);
  });
});
