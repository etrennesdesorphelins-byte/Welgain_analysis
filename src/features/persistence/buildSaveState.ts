import { createEmptyColumnMapping, type ColumnMapping, type CsvValidationResult, type ParsedCsv } from "../../domain/csv";
import type { AnalysisSettings } from "../../domain/analysisSettings";
import type { GaitEvent } from "../../domain/events";
import type { StepTrial } from "../../domain/stepTrial";
import type { VideoMetadata } from "../../domain/video";
import { APP_VERSION, SCHEMA_VERSION, type SavedAnalysisState } from "../../domain/persistence";

export interface BuildSaveStateInput {
  subjectId: string;
  trialName: string;
  videoFile: File | null;
  videoMetadata: VideoMetadata | null;
  parsedCsv: ParsedCsv | null;
  csvValidation: CsvValidationResult | null;
  columnMapping: ColumnMapping | null;
  bodyMeasurements: AnalysisSettings;
  events: GaitEvent[];
  stepTrials: StepTrial[];
  isTimeEstimated: boolean;
  assumedSampleRateHz: number | null;
}

/** 要件定義書16章「出力に含める再現性情報」を満たす保存状態を組み立てる。動画・CSV本体は含めない。 */
export function buildSaveState(input: BuildSaveStateInput): SavedAnalysisState {
  const fps = input.videoMetadata?.detectedFps ?? input.videoMetadata?.assumedFps ?? null;
  const durationSec = input.videoMetadata?.durationSec ?? null;

  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    savedAtIso: new Date().toISOString(),
    subjectId: input.subjectId,
    trialName: input.trialName,
    video: {
      fileName: input.videoFile?.name ?? "",
      fileSizeBytes: input.videoFile?.size ?? 0,
      durationSec,
      fps,
      estimatedTotalFrames: durationSec !== null && fps !== null ? Math.round(durationSec * fps) : null,
    },
    csv: {
      fileName: input.parsedCsv?.fileName ?? "",
      fileSizeBytes: input.parsedCsv?.fileSizeBytes ?? 0,
      encoding: input.parsedCsv?.encoding ?? "",
      rowCount: input.csvValidation?.rowCount ?? 0,
      startTimeSec: input.csvValidation?.startTimeSec ?? null,
      endTimeSec: input.csvValidation?.endTimeSec ?? null,
      estimatedSampleRateHz: input.csvValidation?.estimatedSampleRateHz ?? null,
      columnMapping: input.columnMapping ?? createEmptyColumnMapping(),
      isTimeEstimated: input.isTimeEstimated,
      assumedSampleRateHz: input.assumedSampleRateHz,
    },
    bodyMeasurements: input.bodyMeasurements,
    events: input.events,
    stepTrials: input.stepTrials,
    notes: {
      angleSignConvention:
        "大腿・下腿Euler.y: 正=前方傾斜、負=後方傾斜（docs/formulas.md第9章で動画照合により確定）",
      interpolationMethod: "CSV時刻配列への二分探索＋線形補間（docs/formulas.md第9章）",
      pelvisCorrectionNote: "骨盤補正なし・ありの両方を算出して保持する（docs/formulas.md第5〜6章）",
    },
  };
}
