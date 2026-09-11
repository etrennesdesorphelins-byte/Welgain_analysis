import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  legDistalPosition,
  pelvisCorrectedStrideLength,
  pelvisRotationCorrection,
  rawStrideLength,
  segmentApOffset,
} from "../domain/gaitCalculations";

/**
 * Phase 0で既存Excelから転記した基準値（docs/validation.md参照）に対し、
 * domain/gaitCalculations.tsの実装が許容誤差内で一致することを検証する回帰テスト。
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

// docs/validation.md 第3章の許容誤差。
const ABS_TOLERANCE = 1e-6;

function expectClose(actual: number, expected: number, label: string) {
  const diff = Math.abs(actual - expected);
  expect(diff, `${label}: actual=${actual} expected=${expected} diff=${diff}`).toBeLessThan(
    ABS_TOLERANCE,
  );
}

describe("gaitCalculations vs 既存Excel基準値", () => {
  // expectedRowsのrow_indexはExcel行番号（= rawRowsの配列index + 2）。
  const baselineLowerBackX = Number(rawRows[0]["LowerBack.Single.Euler.x"]);

  it.each(expectedRows)(
    "row_index=$row_index が許容誤差内で一致する",
    (expectedRow) => {
      const rowIndex = Number(expectedRow.row_index);
      const rawRow = rawRows[rowIndex - 2];

      const rightThighY = Number(rawRow["RightThigh.Single.Euler.y"]);
      const leftThighY = Number(rawRow["LeftThigh.Single.Euler.y"]);
      const rightShankY = Number(rawRow["RightLowerLeg.Single.Euler.y"]);
      const leftShankY = Number(rawRow["LeftLowerLeg.Single.Euler.y"]);
      const lowerBackX = Number(rawRow["LowerBack.Single.Euler.x"]);

      const { thighLength, shankLength, pelvisWidth } = bodyMeasurements;

      const rightThighAp = segmentApOffset(rightThighY, thighLength);
      const leftThighAp = segmentApOffset(leftThighY, thighLength);
      const rightShankAp = segmentApOffset(rightShankY, shankLength);
      const leftShankAp = segmentApOffset(leftShankY, shankLength);

      const rightLegDistance = legDistalPosition(
        rightThighY,
        thighLength,
        rightShankY,
        shankLength,
      );
      const leftLegDistance = legDistalPosition(leftThighY, thighLength, leftShankY, shankLength);

      const pelvisCorrection = pelvisRotationCorrection(
        lowerBackX,
        baselineLowerBackX,
        pelvisWidth,
      );
      const strideNoPelvis = rawStrideLength(leftLegDistance, rightLegDistance);
      const strideWithPelvis = pelvisCorrectedStrideLength(strideNoPelvis, pelvisCorrection);

      expectClose(rightThighAp, Number(expectedRow.right_thigh_ap_AB), "right_thigh_ap_AB");
      expectClose(leftThighAp, Number(expectedRow.left_thigh_ap_AC), "left_thigh_ap_AC");
      expectClose(rightShankAp, Number(expectedRow.right_shank_ap_AD), "right_shank_ap_AD");
      expectClose(leftShankAp, Number(expectedRow.left_shank_ap_AE), "left_shank_ap_AE");
      expectClose(
        rightLegDistance,
        Number(expectedRow.right_leg_distance_AM),
        "right_leg_distance_AM",
      );
      expectClose(
        leftLegDistance,
        Number(expectedRow.left_leg_distance_AN),
        "left_leg_distance_AN",
      );
      expectClose(pelvisCorrection, Number(expectedRow.pelvis_correction_AP), "pelvis_correction_AP");
      expectClose(strideNoPelvis, Number(expectedRow.stride_no_pelvis_AQ), "stride_no_pelvis_AQ");
      expectClose(
        strideWithPelvis,
        Number(expectedRow.stride_with_pelvis_AR),
        "stride_with_pelvis_AR",
      );
    },
  );
});
