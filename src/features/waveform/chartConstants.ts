import type { CycleSide } from "../../domain/gaitCycles";

/** dataviz skillの検証済みカテゴリカルパレット（slot1=blue, slot2=orange）。 */
export const SIDE_COLOR: Record<CycleSide, string> = {
  Rt: "#2a78d6",
  Lt: "#eb6834",
};

/** 要件定義書17章：色だけでなく線種でも左右を区別する。 */
export const SIDE_DASH: Record<CycleSide, string | undefined> = {
  Rt: undefined,
  Lt: "6 4",
};

export const SIDE_LABEL: Record<CycleSide, string> = { Rt: "右", Lt: "左" };
