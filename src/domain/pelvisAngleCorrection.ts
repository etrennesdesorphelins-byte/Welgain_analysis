import type { ParsedCsv } from "./csv";

export interface UnwrappedAngleSeries {
  values: number[];
  /** ±180°の境界をまたいで値を連続化した箇所の数。 */
  wrapCount: number;
}

/**
 * ±180°で折り返された角度系列を連続値に戻す（アンラップ）。
 * 直前の有効値との差が180°を超え、360°ずらすと±180°以内に収まる場合に折り返しとみなして補正する。
 * それ以外の大きな跳び（範囲外の異常値など）は補正せず、検証の警告対象として残す。
 * 欠損値（NaN）はそのまま残し、次の有効値は欠損直前の有効値と比較する。
 */
export function unwrapAngleSeries(valuesDeg: number[]): UnwrappedAngleSeries {
  const values: number[] = [];
  let offset = 0;
  let previous: number | null = null;
  let wrapCount = 0;
  for (const raw of valuesDeg) {
    if (!Number.isFinite(raw)) {
      values.push(raw);
      continue;
    }
    if (previous !== null) {
      const diff = raw + offset - previous;
      if (diff > 180 && diff - 360 <= 180) {
        offset -= 360;
        wrapCount++;
      } else if (diff < -180 && diff + 360 >= -180) {
        offset += 360;
        wrapCount++;
      }
    }
    const value = raw + offset;
    values.push(value);
    previous = value;
  }
  return { values, wrapCount };
}

/**
 * 骨盤回旋角の補正オプション：±180°の折り返しを連続化したうえで、CSV先頭の有効値を0°とする。
 * キャリブレーション時と反対方向を向いて計測を始めると±180°付近から始まり、
 * 境界をまたぐたびに符号が反転するため、この補正を利用者が任意で適用する。
 */
export function zeroBasedUnwrappedAngles(valuesDeg: number[]): number[] {
  const { values } = unwrapAngleSeries(valuesDeg);
  const baseline = values.find((v) => Number.isFinite(v));
  if (baseline === undefined) return values;
  return values.map((v) => (Number.isFinite(v) ? v - baseline : v));
}

/**
 * CSVの骨盤回旋角列を補正後の値に置き換えたCSVを返す（元のCSVは変更しない）。
 * 列名は変えないため、歩行解析・ステップ解析・検証のすべてに補正後の値が使われる。
 */
export function applyPelvisAngleCorrection(parsed: ParsedCsv, lowerBackXColumn: string): ParsedCsv {
  const corrected = zeroBasedUnwrappedAngles(
    parsed.rows.map((row) => {
      const raw = row[lowerBackXColumn];
      return raw === undefined || raw === "" ? NaN : Number.parseFloat(raw);
    }),
  );
  const rows = parsed.rows.map((row, i) => ({
    ...row,
    [lowerBackXColumn]: Number.isFinite(corrected[i]) ? String(corrected[i]) : (row[lowerBackXColumn] ?? ""),
  }));
  return { ...parsed, rows };
}
