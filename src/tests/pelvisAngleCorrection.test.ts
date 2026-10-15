import { describe, expect, it } from "vitest";
import type { ParsedCsv } from "../domain/csv";
import { pelvisRotationCorrection } from "../domain/gaitCalculations";
import {
  applyPelvisAngleCorrection,
  unwrapAngleSeries,
  zeroBasedUnwrappedAngles,
} from "../domain/pelvisAngleCorrection";

// キャリブレーションと反対方向を向いて計測を始めた試行の LowerBack.Single.Euler.x 相当。
const WRAPPED = [-174.8, -177.6, -178.8, 179.9, 177.4, 174, 170.5, 175.9];

describe("unwrapAngleSeries", () => {
  it("±180°をまたいで符号が反転した値を連続した角度に戻す", () => {
    const { values, wrapCount } = unwrapAngleSeries(WRAPPED);
    expect(wrapCount).toBe(1);
    expect(values[3]).toBeCloseTo(-180.1, 5);
    expect(values[6]).toBeCloseTo(-189.5, 5);
  });

  it("正方向にまたいだ場合や、境界を往復した場合も連続化する", () => {
    const { values, wrapCount } = unwrapAngleSeries([178, -179, -175, 179]);
    expect(wrapCount).toBe(2);
    expect(values).toEqual([178, 181, 185, 179]);
  });

  it("欠損値（NaN）は残し、次の有効値は欠損直前の有効値と比較する", () => {
    const { values } = unwrapAngleSeries([-179, NaN, 179]);
    expect(Number.isNaN(values[1])).toBe(true);
    expect(values[2]).toBe(-181);
  });

  it("折り返しのない系列や、1周分では説明できない異常値は変更しない", () => {
    expect(unwrapAngleSeries([0, 5, -170, 3])).toEqual({ values: [0, 5, -170, 3], wrapCount: 0 });
    expect(unwrapAngleSeries([0, 999]).values).toEqual([0, 999]);
  });
});

describe("zeroBasedUnwrappedAngles", () => {
  it("連続化したうえで先頭の有効値を0°とする", () => {
    const values = zeroBasedUnwrappedAngles([NaN, ...WRAPPED]);
    expect(Number.isNaN(values[0])).toBe(true);
    expect(values[1]).toBe(0);
    expect(values[4]).toBeCloseTo(-5.3, 5);
    expect(values[7]).toBeCloseTo(-14.7, 5);
  });

  it("補正しても骨盤回旋補正量（先頭行基準のsin）は元の値と一致する", () => {
    const corrected = zeroBasedUnwrappedAngles(WRAPPED);
    for (let i = 0; i < WRAPPED.length; i++) {
      expect(pelvisRotationCorrection(corrected[i], corrected[0], 20)).toBeCloseTo(
        pelvisRotationCorrection(WRAPPED[i], WRAPPED[0], 20),
        9,
      );
    }
  });
});

describe("applyPelvisAngleCorrection", () => {
  it("骨盤回旋角列だけを補正値に置き換え、他の列と元のCSVは変更しない", () => {
    const parsed: ParsedCsv = {
      fileName: "t.csv",
      fileSizeBytes: 1,
      encoding: "utf-8",
      headers: ["time", "pelvis", "thigh"],
      rows: [
        { time: "0", pelvis: "-179", thigh: "1" },
        { time: "0.05", pelvis: "", thigh: "2" },
        { time: "0.1", pelvis: "178", thigh: "3" },
      ],
    };
    const result = applyPelvisAngleCorrection(parsed, "pelvis");
    expect(result.rows.map((r) => r.pelvis)).toEqual(["0", "", "-3"]);
    expect(result.rows.map((r) => r.thigh)).toEqual(["1", "2", "3"]);
    expect(parsed.rows[2].pelvis).toBe("178");
  });
});
