import type { ChangeEvent } from "react";
import type { VideoMetadata } from "../../domain/video";
import { FPS_OPTIONS } from "../../domain/video";
import type { CsvImportState } from "./useCsvImport";
import { ColumnMappingPanel } from "./ColumnMappingPanel";
import { ValidationIssueList } from "./ValidationIssueList";
import { TimeRecoveryForm } from "./TimeRecoveryForm";

interface FileImportPanelProps {
  onSelectVideoFile: (file: File) => void;
  videoFileName: string | null;
  videoMetadata: VideoMetadata | null;
  fpsOverride: number;
  onFpsOverrideChange: (fps: number) => void;
  csv: CsvImportState;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSeconds(sec: number | null): string {
  if (sec === null) return "—";
  return `${sec.toFixed(2)} 秒`;
}

export function FileImportPanel({
  onSelectVideoFile,
  videoFileName,
  videoMetadata,
  fpsOverride,
  onFpsOverrideChange,
  csv,
}: FileImportPanelProps) {
  function handleVideoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSelectVideoFile(file);
  }

  function handleCsvChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void csv.loadFile(file);
  }

  return (
    <section className="file-import-panel">
      <div className="file-import-panel__block">
        <h3>動画ファイル</h3>
        <input type="file" accept="video/mp4" onChange={handleVideoChange} />
        {videoFileName && (
          <dl className="file-info">
            <dt>ファイル名</dt>
            <dd>{videoFileName}</dd>
            {videoMetadata && (
              <>
                <dt>解像度</dt>
                <dd>
                  {videoMetadata.width} × {videoMetadata.height}
                </dd>
                <dt>再生時間</dt>
                <dd>{formatSeconds(videoMetadata.durationSec)}</dd>
                <dt>フレームレート</dt>
                <dd>
                  {videoMetadata.detectedFps
                    ? `${videoMetadata.detectedFps} fps（取得値）`
                    : "取得できません（下記で想定値を選択）"}
                </dd>
                {!videoMetadata.detectedFps && (
                  <>
                    <dt>想定fps</dt>
                    <dd>
                      <select
                        value={fpsOverride}
                        onChange={(e) => onFpsOverrideChange(Number(e.target.value))}
                      >
                        {FPS_OPTIONS.map((fps) => (
                          <option key={fps} value={fps}>
                            {fps} fps
                          </option>
                        ))}
                      </select>
                    </dd>
                  </>
                )}
              </>
            )}
          </dl>
        )}
        <p className="file-import-panel__note">
          動画・CSVはブラウザ内でのみ処理され、外部へ送信されません。
        </p>
      </div>

      <div className="file-import-panel__block">
        <h3>CSVファイル</h3>
        <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} />
        {csv.isLoading && <p>読み込み中…</p>}
        {csv.loadError && <p className="file-import-panel__error">{csv.loadError}</p>}
        {csv.parsed && (
          <dl className="file-info">
            <dt>ファイル名</dt>
            <dd>{csv.parsed.fileName}</dd>
            <dt>サイズ</dt>
            <dd>{formatBytes(csv.parsed.fileSizeBytes)}</dd>
            <dt>文字コード</dt>
            <dd>{csv.parsed.encoding}</dd>
            <dt>行数</dt>
            <dd>{csv.validation?.rowCount ?? csv.parsed.rows.length}</dd>
            <dt>開始〜終了</dt>
            <dd>
              {formatSeconds(csv.validation?.startTimeSec ?? null)} 〜{" "}
              {formatSeconds(csv.validation?.endTimeSec ?? null)}
            </dd>
            <dt>継続時間</dt>
            <dd>{formatSeconds(csv.validation?.durationSec ?? null)}</dd>
            <dt>推定サンプリング周波数</dt>
            <dd>
              {csv.validation?.estimatedSampleRateHz
                ? `約 ${csv.validation.estimatedSampleRateHz.toFixed(1)} Hz`
                : "—"}
            </dd>
            {csv.isTimeEstimated && (
              <>
                <dt>時刻列</dt>
                <dd className="file-import-panel__time-estimated-badge">
                  推定値（行番号 × 1/{csv.assumedSampleRateHz}Hz、実測ではありません）
                </dd>
              </>
            )}
          </dl>
        )}
        {csv.parsed && csv.mapping && (
          <>
            <h4>列割当</h4>
            <ColumnMappingPanel
              headers={csv.parsed.headers}
              mapping={csv.mapping}
              onChange={csv.setColumnMapping}
            />
          </>
        )}
        {csv.validation && <ValidationIssueList issues={csv.validation.issues} />}
        {csv.validation?.issues.some(
          (i) => i.code === "no-valid-time-progression" || i.code === "missing-time-column",
        ) &&
          !csv.isTimeEstimated && <TimeRecoveryForm onApply={csv.applySyntheticTime} />}
      </div>
    </section>
  );
}
