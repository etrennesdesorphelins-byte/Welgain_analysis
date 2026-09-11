/** CSVの列役割。要件定義書4.2・技術提案書7.2に対応する。 */
export type CsvColumnKey =
  | "time"
  | "rightThighY"
  | "leftThighY"
  | "rightShankY"
  | "leftShankY"
  | "lowerBackX"
  | "rightHipAngle"
  | "leftHipAngle"
  | "rightKneeAngle"
  | "leftKneeAngle";

export interface CsvColumnDefinition {
  key: CsvColumnKey;
  label: string;
  /** 完全一致・大文字小文字無視一致に使う既知の別名候補（最有力候補を先頭に）。 */
  knownAliases: string[];
  required: boolean;
}

export const CSV_COLUMN_DEFINITIONS: CsvColumnDefinition[] = [
  {
    key: "time",
    label: "時刻列",
    knownAliases: ["UnixTime", "Time", "Timestamp", "time", "timestamp"],
    required: true,
  },
  {
    key: "rightThighY",
    label: "右大腿角度（前後）",
    knownAliases: ["RightThigh.Single.Euler.y"],
    required: false,
  },
  {
    key: "leftThighY",
    label: "左大腿角度（前後）",
    knownAliases: ["LeftThigh.Single.Euler.y"],
    required: false,
  },
  {
    key: "rightShankY",
    label: "右下腿角度（前後）",
    knownAliases: ["RightLowerLeg.Single.Euler.y"],
    required: false,
  },
  {
    key: "leftShankY",
    label: "左下腿角度（前後）",
    knownAliases: ["LeftLowerLeg.Single.Euler.y"],
    required: false,
  },
  {
    key: "lowerBackX",
    label: "骨盤回旋角",
    knownAliases: ["LowerBack.Single.Euler.x"],
    required: false,
  },
  {
    key: "rightHipAngle",
    label: "右股関節角度",
    knownAliases: ["RightHip.Angle"],
    required: false,
  },
  {
    key: "leftHipAngle",
    label: "左股関節角度",
    knownAliases: ["LeftHip.Angle"],
    required: false,
  },
  {
    key: "rightKneeAngle",
    label: "右膝関節角度",
    knownAliases: ["RightKnee.Angle"],
    required: false,
  },
  {
    key: "leftKneeAngle",
    label: "左膝関節角度",
    knownAliases: ["LeftKnee.Angle"],
    required: false,
  },
];

/** CsvColumnKey -> 実際のCSVヘッダ名（未割当はnull）。 */
export type ColumnMapping = Record<CsvColumnKey, string | null>;

/** すべての列が未割当の初期状態を作る（JSON保存の既定値等に使用）。 */
export function createEmptyColumnMapping(): ColumnMapping {
  const mapping = {} as ColumnMapping;
  for (const def of CSV_COLUMN_DEFINITIONS) mapping[def.key] = null;
  return mapping;
}

export type CsvEncoding = "utf-8" | "utf-8-bom" | "shift_jis";

export interface ParsedCsv {
  fileName: string;
  fileSizeBytes: number;
  encoding: CsvEncoding;
  headers: string[];
  /** 各行は元ヘッダ名をキーとした文字列値。数値変換は用途に応じて後段で行う。 */
  rows: Record<string, string>[];
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface CsvValidationResult {
  issues: ValidationIssue[];
  /** error重大度のissueが1件でもあれば解析停止。 */
  hasBlockingError: boolean;
  rowCount: number;
  startTimeSec: number | null;
  endTimeSec: number | null;
  durationSec: number | null;
  estimatedSampleRateHz: number | null;
  medianSampleIntervalSec: number | null;
}

/** 代替時刻を保持する合成列のヘッダ名。実CSVの列名と衝突しないよう記号を含める。 */
export const SYNTHETIC_TIME_COLUMN = "__estimated_time_sec__";

/**
 * 時刻列が実測として使用できない場合の代替手段：行番号と利用者が指定した
 * 仮定サンプリング周波数から相対秒を機械的に生成し、CSVへ列として追加する。
 * 実測値ではなく推定値であることを、呼び出し側（UI・保存JSON・出力）で
 * 必ず明示すること（要件定義書16章の再現性情報に対応）。
 */
export function applySyntheticTimeColumn(parsed: ParsedCsv, assumedSampleRateHz: number): ParsedCsv {
  const rows = parsed.rows.map((row, i) => ({
    ...row,
    [SYNTHETIC_TIME_COLUMN]: String(i / assumedSampleRateHz),
  }));
  const headers = parsed.headers.includes(SYNTHETIC_TIME_COLUMN)
    ? parsed.headers
    : [...parsed.headers, SYNTHETIC_TIME_COLUMN];
  return { ...parsed, rows, headers };
}

/**
 * Unix時刻等の絶対時刻列を、先頭行を0秒とした相対秒へ変換する。
 * 生値の大きさからミリ秒／秒を判定する（|中央値| > 1e11 ならミリ秒とみなす）。
 * 技術提案書7.3「CSV先頭を0秒とした相対時刻へ変換する」に対応。
 */
export function toRelativeSeconds(rawTimeValues: number[]): number[] {
  const finite = rawTimeValues.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return rawTimeValues.map(() => NaN);
  const sorted = [...finite].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const isMilliseconds = Math.abs(median) > 1e11;
  const scale = isMilliseconds ? 1000 : 1;
  const base = rawTimeValues.find((v) => Number.isFinite(v))! / scale;
  return rawTimeValues.map((v) => (Number.isFinite(v) ? v / scale - base : NaN));
}
