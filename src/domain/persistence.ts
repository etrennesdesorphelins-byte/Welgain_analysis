import { z } from "zod";
import { CSV_COLUMN_DEFINITIONS, type CsvColumnKey } from "./csv";

export const SCHEMA_VERSION = 1;
/** package.jsonのversionと同期させる（JSON importを避けるため手動保持）。 */
export const APP_VERSION = "0.1.0";

const columnMappingShape = Object.fromEntries(
  CSV_COLUMN_DEFINITIONS.map((def) => [def.key, z.string().nullable()]),
) as Record<CsvColumnKey, z.ZodNullable<z.ZodString>>;

const columnMappingSchema = z.object(columnMappingShape);

const gaitEventTypeSchema = z.enum(["Rt_IC", "Lt_IC", "Rt_Off", "Lt_Off"]);

const gaitEventSchema = z.object({
  id: z.string(),
  type: gaitEventTypeSchema,
  videoTimeSec: z.number(),
  estimatedFrame: z.number().nullable(),
  csvTimeSec: z.number(),
});

const stepSideSchema = z.enum(["Rt", "Lt"]);

const stepTrialSchema = z.object({
  id: z.string(),
  side: stepSideSchema,
  movementStartVideoTimeSec: z.number(),
  movementStartCsvTimeSec: z.number(),
  icVideoTimeSec: z.number(),
  icCsvTimeSec: z.number(),
  movementEndVideoTimeSec: z.number().nullable(),
  movementEndCsvTimeSec: z.number().nullable(),
});

const lengthUnitSchema = z.enum(["cm", "m"]);

const analysisSettingsSchema = z.object({
  thighLength: z.number().nullable(),
  shankLength: z.number().nullable(),
  pelvisWidth: z.number().nullable(),
  lengthUnit: lengthUnitSchema,
});

const gaitSpeedInputSchema = z.object({
  measuredDistanceM: z.number().nullable(),
  startTimeSec: z.number().nullable(),
  endTimeSec: z.number().nullable(),
});

/**
 * 要件定義書16章「出力に含める再現性情報」に対応する保存JSONのスキーマ。
 * 動画・CSV本体は含めない（技術提案書5.4）。
 */
export const savedAnalysisStateSchema = z.object({
  schemaVersion: z.number(),
  appVersion: z.string(),
  savedAtIso: z.string(),
  subjectId: z.string(),
  trialName: z.string(),
  video: z.object({
    fileName: z.string(),
    fileSizeBytes: z.number(),
    durationSec: z.number().nullable(),
    fps: z.number().nullable(),
    estimatedTotalFrames: z.number().nullable(),
  }),
  csv: z.object({
    fileName: z.string(),
    fileSizeBytes: z.number(),
    encoding: z.string(),
    rowCount: z.number(),
    startTimeSec: z.number().nullable(),
    endTimeSec: z.number().nullable(),
    estimatedSampleRateHz: z.number().nullable(),
    columnMapping: columnMappingSchema,
    /** 時刻列が実測ではなく、行番号と仮定周波数から生成した推定値であるか（要件定義書16章）。 */
    isTimeEstimated: z.boolean(),
    assumedSampleRateHz: z.number().nullable(),
  }),
  bodyMeasurements: analysisSettingsSchema,
  events: z.array(gaitEventSchema),
  stepTrials: z.array(stepTrialSchema),
  gaitSpeedInput: gaitSpeedInputSchema,
  notes: z.object({
    angleSignConvention: z.string(),
    interpolationMethod: z.string(),
    pelvisCorrectionNote: z.string(),
  }),
});

export type SavedAnalysisState = z.infer<typeof savedAnalysisStateSchema>;

export interface ParseSavedStateResult {
  success: boolean;
  data: SavedAnalysisState | null;
  error: string | null;
}

/**
 * 技術提案書13.2：schemaVersionを検証してから内容を検証する。
 * 現バージョンと異なる場合は、将来の移行関数を差し込む拡張点として明示的エラーを返す
 * （現時点ではバージョンが1種類のみのため移行処理は未実装）。
 */
export function parseSavedState(json: unknown): ParseSavedStateResult {
  if (typeof json === "object" && json !== null && "schemaVersion" in json) {
    const version = (json as { schemaVersion: unknown }).schemaVersion;
    if (typeof version === "number" && version !== SCHEMA_VERSION) {
      return {
        success: false,
        data: null,
        error: `保存データのバージョン(${version})が現在のアプリ(${SCHEMA_VERSION})と異なります。この版では異なるバージョン間の自動移行に対応していません。`,
      };
    }
  }

  const result = savedAnalysisStateSchema.safeParse(json);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }
  return {
    success: false,
    data: null,
    error: `JSONの形式が不正です: ${result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ")}`,
  };
}
