import { describe, expect, it } from "vitest";
import { isAnalysisSettingsComplete, toCentimeters } from "../domain/analysisSettings";

describe("toCentimeters", () => {
  it("mはcmへ100倍で変換する", () => {
    expect(toCentimeters(0.52, "m")).toBeCloseTo(52, 6);
  });

  it("cmはそのまま返す", () => {
    expect(toCentimeters(52, "cm")).toBe(52);
  });
});

describe("isAnalysisSettingsComplete", () => {
  it("3項目すべて正の値なら完了", () => {
    expect(
      isAnalysisSettingsComplete({
        thighLength: 52,
        shankLength: 49,
        pelvisWidth: 31,
        lengthUnit: "cm",
      }),
    ).toBe(true);
  });

  it("未入力があれば未完了", () => {
    expect(
      isAnalysisSettingsComplete({
        thighLength: null,
        shankLength: 49,
        pelvisWidth: 31,
        lengthUnit: "cm",
      }),
    ).toBe(false);
  });
});
