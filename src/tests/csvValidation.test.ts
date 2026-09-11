import { describe, expect, it } from "vitest";
import type { ColumnMapping, ParsedCsv } from "../domain/csv";
import { CSV_COLUMN_DEFINITIONS } from "../domain/csv";
import { validateCsv } from "../features/file-import/csvValidation";

function emptyMapping(): ColumnMapping {
  const mapping = {} as ColumnMapping;
  for (const def of CSV_COLUMN_DEFINITIONS) mapping[def.key] = null;
  return mapping;
}

function makeParsed(rows: Record<string, string>[]): ParsedCsv {
  return {
    fileName: "test.csv",
    fileSizeBytes: 100,
    encoding: "utf-8",
    headers: Object.keys(rows[0] ?? {}),
    rows,
  };
}

describe("validateCsv", () => {
  it("時刻列が未割当の場合はブロッキングエラーになる", () => {
    const parsed = makeParsed([{ time: "0" }, { time: "1" }]);
    const result = validateCsv(parsed, emptyMapping());

    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === "missing-time-column")).toBe(true);
  });

  it("有効行が2行未満の場合はブロッキングエラーになる", () => {
    const parsed = makeParsed([{ time: "0" }]);
    const mapping = { ...emptyMapping(), time: "time" };
    const result = validateCsv(parsed, mapping);

    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === "insufficient-rows")).toBe(true);
  });

  it("単調増加する20Hz相当のCSVは警告なしで継続時間を算出する", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ time: String(i * 0.05) }));
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time" };
    const result = validateCsv(parsed, mapping);

    expect(result.hasBlockingError).toBe(false);
    expect(result.issues.some((i) => i.severity === "error")).toBe(false);
    expect(result.durationSec).toBeCloseTo(0.45, 5);
    expect(result.estimatedSampleRateHz).toBeCloseTo(20, 5);
  });

  it("時刻の逆転を検出して警告する", () => {
    const rows = [{ time: "0" }, { time: "1" }, { time: "0.5" }, { time: "2" }];
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time" };
    const result = validateCsv(parsed, mapping);

    expect(result.issues.some((i) => i.code === "time-reversal")).toBe(true);
  });

  it("時刻列が全行同一の場合はブロッキングエラーになる（実CSVで発見した精度不足の再発防止）", () => {
    const rows = Array.from({ length: 10 }, () => ({ time: "1.77779E+12" }));
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time" };
    const result = validateCsv(parsed, mapping);

    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === "no-valid-time-progression")).toBe(true);
    expect(result.durationSec).toBe(0);
  });

  it("想定範囲外の角度値を検出して警告する", () => {
    const rows = [
      { time: "0", angle: "10" },
      { time: "1", angle: "999" },
    ];
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time", rightThighY: "angle" };
    const result = validateCsv(parsed, mapping);

    expect(result.issues.some((i) => i.code === "suspicious-angle-range")).toBe(true);
  });

  it("骨盤回旋角は絶対値ではなく基準フレームからの変化量で判定する（実CSVで発見した誤検知の再発防止）", () => {
    // 絶対値は150〜165度と大きいが、先頭行からの変化量は小さい実データ相当のケース。
    const rows = [
      { time: "0", pelvis: "151.4" },
      { time: "0.05", pelvis: "150.5" },
      { time: "0.1", pelvis: "164.4" },
      { time: "0.15", pelvis: "159.1" },
    ];
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time", lowerBackX: "pelvis" };
    const result = validateCsv(parsed, mapping);

    expect(result.issues.some((i) => i.code === "suspicious-angle-range")).toBe(false);
  });

  it("骨盤回旋角でも基準フレームから大きく変化した場合は警告する", () => {
    const rows = [
      { time: "0", pelvis: "0" },
      { time: "0.05", pelvis: "5" },
      { time: "0.1", pelvis: "-170" },
      { time: "0.15", pelvis: "3" },
    ];
    const parsed = makeParsed(rows);
    const mapping = { ...emptyMapping(), time: "time", lowerBackX: "pelvis" };
    const result = validateCsv(parsed, mapping);

    expect(result.issues.some((i) => i.code === "suspicious-angle-range")).toBe(true);
  });
});
