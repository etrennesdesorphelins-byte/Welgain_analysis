export interface VideoMetadata {
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  /** ブラウザから取得できる保証はないため、取得できない場合はnull。 */
  detectedFps: number | null;
  /** detectedFpsがnullのとき、利用者が選択したfps。 */
  assumedFps: number;
}

export const FPS_OPTIONS = [24, 25, 30, 60] as const;
export const DEFAULT_ASSUMED_FPS = 30;
