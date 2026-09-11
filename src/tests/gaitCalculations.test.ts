import { describe, expect, it } from "vitest";
import { absoluteStride, toIcRelativeStride } from "../domain/gaitCalculations";

describe("toIcRelativeStride", () => {
  it("Rt_ICでは符号を反転する", () => {
    expect(toIcRelativeStride(5, "Rt")).toBe(-5);
    expect(toIcRelativeStride(-5, "Rt")).toBe(5);
  });

  it("Lt_ICでは符号をそのまま維持する", () => {
    expect(toIcRelativeStride(5, "Lt")).toBe(5);
    expect(toIcRelativeStride(-5, "Lt")).toBe(-5);
  });
});

describe("absoluteStride", () => {
  it("符号に関わらず絶対値を返す", () => {
    expect(absoluteStride(5)).toBe(5);
    expect(absoluteStride(-5)).toBe(5);
    expect(absoluteStride(0)).toBe(0);
  });
});
