import {
  CSV_COLUMN_DEFINITIONS,
  toRelativeSeconds,
  type ColumnMapping,
  type CsvValidationResult,
  type ParsedCsv,
  type ValidationIssue,
} from "../../domain/csv";

const SUSPICIOUS_ANGLE_ABS_DEG = 150;
/** サンプリング間隔の相対ばらつき（中央値に対する比）がこれを超えたら警告。 */
const SAMPLE_INTERVAL_VARIATION_WARN_RATIO = 0.5;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 要件定義書5章のCSV検証を行う。重大な不備（時刻列欠落・有効行不足）はerror、
 * それ以外（時刻逆転・欠損値・範囲外値・サンプリング不安定）はwarningとして報告する。
 */
export function validateCsv(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
): CsvValidationResult {
  const issues: ValidationIssue[] = [];

  if (!mapping.time) {
    issues.push({
      severity: "error",
      code: "missing-time-column",
      message: "時刻列が割り当てられていません。列割当を確認してください。",
    });
    return {
      issues,
      hasBlockingError: true,
      rowCount: parsed.rows.length,
      startTimeSec: null,
      endTimeSec: null,
      durationSec: null,
      estimatedSampleRateHz: null,
      medianSampleIntervalSec: null,
    };
  }

  for (const def of CSV_COLUMN_DEFINITIONS) {
    if (!def.required && !mapping[def.key]) {
      issues.push({
        severity: "warning",
        code: "unmapped-optional-column",
        message: `${def.label}の列が割り当てられていません。関連する解析結果は算出されません。`,
      });
    }
  }

  if (parsed.rows.length < 2) {
    issues.push({
      severity: "error",
      code: "insufficient-rows",
      message: "有効なデータ行が2行未満のため解析できません。",
    });
    return {
      issues,
      hasBlockingError: true,
      rowCount: parsed.rows.length,
      startTimeSec: null,
      endTimeSec: null,
      durationSec: null,
      estimatedSampleRateHz: null,
      medianSampleIntervalSec: null,
    };
  }

  const timeKey = mapping.time;
  const rawTimes = parsed.rows.map((row) => Number.parseFloat(row[timeKey]));
  const missingTimeCount = rawTimes.filter((v) => !Number.isFinite(v)).length;
  if (missingTimeCount > 0) {
    issues.push({
      severity: "warning",
      code: "missing-time-values",
      message: `時刻列に欠損または非数値が${missingTimeCount}件あります。`,
    });
  }

  const relativeTimes = toRelativeSeconds(rawTimes);

  let reversalCount = 0;
  let duplicateCount = 0;
  const intervals: number[] = [];
  for (let i = 1; i < relativeTimes.length; i++) {
    const prev = relativeTimes[i - 1];
    const curr = relativeTimes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;
    if (curr < prev) reversalCount++;
    else if (curr === prev) duplicateCount++;
    else intervals.push(curr - prev);
  }

  if (reversalCount > 0) {
    issues.push({
      severity: reversalCount > relativeTimes.length * 0.1 ? "error" : "warning",
      code: "time-reversal",
      message: `時刻の逆転が${reversalCount}件あります。`,
    });
  }
  if (duplicateCount > 0) {
    issues.push({
      severity: "warning",
      code: "duplicate-time",
      message: `重複した時刻が${duplicateCount}件あります。`,
    });
  }

  // 有効な区間（前の行より時刻が進んでいる箇所）が存在しない場合、
  // サンプリング間隔・継続時間が算出できず時刻軸として機能しない（重大な不備）。
  //
  // 実データで繰り返し確認された典型例：UnixTime列（ミリ秒等の大きな整数）を含むCSVを
  // Excelで開いて（自動保存を含め）再保存すると、セルの表示形式が「標準」のままの場合、
  // 有効数字6桁の指数表記（例："1.77779E+12"）に丸められ、短時間の連続データが
  // すべて同一の値に潰れてしまう。元データ側の問題であり、アプリの不具合ではない。
  if (intervals.length === 0 && relativeTimes.length > 1) {
    issues.push({
      severity: "error",
      code: "no-valid-time-progression",
      message:
        "時刻列から有効なサンプリング間隔を算出できません（時刻がすべて同一または逆転しています）。" +
        "よくある原因は、時刻列（ミリ秒等の大きな整数）を含むCSVをExcelで開いて保存し直したことによる、" +
        "有効数字6桁への丸め（例:1.77779E+12のような指数表記への変換）です。" +
        "Excelを経由せずに元の計測ソフトから直接エクスポートしたCSV、またはExcelで編集する場合は" +
        "時刻列のセル表示形式を「数値（小数点以下0桁）」に設定してから保存したCSVを読み込んでください。",
    });
  }

  const medianInterval = median(intervals);
  if (medianInterval !== null && intervals.length > 1) {
    const deviations = intervals.map((v) => Math.abs(v - medianInterval));
    const medianDeviation = median(deviations) ?? 0;
    if (
      medianInterval > 0 &&
      medianDeviation / medianInterval > SAMPLE_INTERVAL_VARIATION_WARN_RATIO
    ) {
      issues.push({
        severity: "warning",
        code: "irregular-sampling",
        message: "サンプリング間隔のばらつきが大きいため、推定サンプリング周波数の精度に注意してください。",
      });
    }
  }

  const angleColumns = CSV_COLUMN_DEFINITIONS.filter(
    (def) => def.key !== "time" && mapping[def.key],
  );
  // 列ごとに超過件数を集計する。骨盤回旋角（lowerBackX）はジンバルロック等で
  // 単独で範囲外になりやすいため、どのパラメーターが原因かを特定できるよう、
  // 1件の集計にまとめず列単位で警告を出す。
  for (const def of angleColumns) {
    const key = mapping[def.key]!;
    const values = parsed.rows.map((row) => {
      const raw = row[key];
      return raw === undefined || raw === "" ? NaN : Number.parseFloat(raw);
    });

    let outOfRangeCount = 0;
    if (def.key === "lowerBackX") {
      // 骨盤回旋角はセンサーの絶対基準方向が試行ごとに異なり得るため、formulas.md第5章の
      // 骨盤回旋補正と同様に「CSV先頭の有効値（基準フレーム）からの変化量」で判定する。
      const baseline = values.find((v) => Number.isFinite(v));
      if (baseline !== undefined) {
        for (const value of values) {
          if (Number.isFinite(value) && Math.abs(value - baseline) > SUSPICIOUS_ANGLE_ABS_DEG) {
            outOfRangeCount++;
          }
        }
      }
    } else {
      for (const value of values) {
        if (Number.isFinite(value) && Math.abs(value) > SUSPICIOUS_ANGLE_ABS_DEG) {
          outOfRangeCount++;
        }
      }
    }

    if (outOfRangeCount > 0) {
      issues.push({
        severity: "warning",
        code: "suspicious-angle-range",
        columnKey: def.key,
        message: `${def.label}（列:${key}）が想定範囲（±${SUSPICIOUS_ANGLE_ABS_DEG}度）を超える値が${outOfRangeCount}件あります。ジンバルロック等の可能性があります。単位・列割当を確認してください。`,
      });
    }
  }

  const finiteRelativeTimes = relativeTimes.filter((v) => Number.isFinite(v));
  const startTimeSec = finiteRelativeTimes.length > 0 ? finiteRelativeTimes[0] : null;
  const endTimeSec =
    finiteRelativeTimes.length > 0
      ? finiteRelativeTimes[finiteRelativeTimes.length - 1]
      : null;
  const durationSec =
    startTimeSec !== null && endTimeSec !== null ? endTimeSec - startTimeSec : null;

  return {
    issues,
    hasBlockingError: issues.some((issue) => issue.severity === "error"),
    rowCount: parsed.rows.length,
    startTimeSec,
    endTimeSec,
    durationSec,
    estimatedSampleRateHz: medianInterval && medianInterval > 0 ? 1 / medianInterval : null,
    medianSampleIntervalSec: medianInterval,
  };
}
