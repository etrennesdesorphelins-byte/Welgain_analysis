import { describe, expect, it } from "vitest";
import { applySyntheticTimeColumn, SYNTHETIC_TIME_COLUMN, type ParsedCsv } from "../domain/csv";

function makeParsed(rows: Record<string, string>[]): ParsedCsv {
  return {
    fileName: "test.csv",
    fileSizeBytes: 100,
    encoding: "utf-8",
    headers: Object.keys(rows[0] ?? {}),
    rows,
  };
}

describe("applySyntheticTimeColumn", () => {
  it("行番号と仮定周波数から相対秒の列を追加する", () => {
    const parsed = makeParsed([{ a: "1" }, { a: "2" }, { a: "3" }, { a: "4" }]);
    const result = applySyntheticTimeColumn(parsed, 20);

    expect(result.headers).toContain(SYNTHETIC_TIME_COLUMN);
    expect(result.rows.map((r) => r[SYNTHETIC_TIME_COLUMN])).toEqual(["0", "0.05", "0.1", "0.15"]);
    // 元の列は変更しない
    expect(result.rows.map((r) => r.a)).toEqual(["1", "2", "3", "4"]);
  });

  it("既存の合成列を再度上書きしても列が重複しない", () => {
    const parsed = makeParsed([{ a: "1" }, { a: "2" }]);
    const once = applySyntheticTimeColumn(parsed, 20);
    const twice = applySyntheticTimeColumn(once, 10);

    expect(twice.headers.filter((h) => h === SYNTHETIC_TIME_COLUMN)).toHaveLength(1);
    expect(twice.rows.map((r) => r[SYNTHETIC_TIME_COLUMN])).toEqual(["0", "0.1"]);
  });
});
