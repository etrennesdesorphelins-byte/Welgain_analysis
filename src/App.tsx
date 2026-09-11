import { useCallback, useMemo, useRef, useState } from "react";
import { useVideoFile } from "./features/file-import/useVideoFile";
import { useCsvImport, type CsvImportState } from "./features/file-import/useCsvImport";
import { FileImportPanel } from "./features/file-import/FileImportPanel";
import { VideoPlayer } from "./features/video-player/VideoPlayer";
import { useVideoPlayback } from "./features/video-player/useVideoPlayback";
import { useZoomPan } from "./features/video-player/useZoomPan";
import { useVideoKeyboardShortcuts } from "./features/video-player/useVideoKeyboardShortcuts";
import type { VideoMetadata } from "./domain/video";
import { DEFAULT_ASSUMED_FPS } from "./domain/video";
import type { CsvColumnKey } from "./domain/csv";
import { APP_VERSION, type SavedAnalysisState } from "./domain/persistence";
import { AppInfoPanel } from "./features/app-info/AppInfoPanel";
import { useAnalysisSettings } from "./features/analysis-settings/useAnalysisSettings";
import { BodyMeasurementsForm } from "./features/analysis-settings/BodyMeasurementsForm";
import { useSync } from "./features/synchronization/useSync";
import { SyncInfoPanel } from "./features/synchronization/SyncInfoPanel";
import { useEvents } from "./features/events/useEvents";
import { EventRegistrationButtons } from "./features/events/EventRegistrationButtons";
import { EventList } from "./features/events/EventList";
import { useStrideRangeResults, type StrideRangeSelection } from "./features/gait-analysis/useStrideRangeResults";
import { StrideResultsPanel } from "./features/gait-analysis/StrideResultsPanel";
import { useStrideWaveform } from "./features/gait-analysis/useStrideWaveform";
import { StrideWaveformPanel } from "./features/gait-analysis/StrideWaveformPanel";
import { useGaitPhaseTiming } from "./features/gait-phase-timing/useGaitPhaseTiming";
import { GaitPhaseTimingPanel } from "./features/gait-phase-timing/GaitPhaseTimingPanel";
import { useStepTrials } from "./features/step-analysis/useStepTrials";
import { useStepResults } from "./features/step-analysis/useStepResults";
import { StepTrialForm } from "./features/step-analysis/StepTrialForm";
import { StepResultsPanel } from "./features/step-analysis/StepResultsPanel";
import { buildSaveState } from "./features/persistence/buildSaveState";
import { SaveLoadPanel } from "./features/persistence/SaveLoadPanel";
import { useUnsavedChangesWarning } from "./features/persistence/useUnsavedChangesWarning";
import { ExportButtons } from "./features/export/ExportButtons";
import { ModeSelectPage, type AnalysisMode } from "./features/app-shell/ModeSelectPage";

function dirtySnapshot(events: unknown, stepTrials: unknown): string {
  return JSON.stringify({ events, stepTrials });
}

export function App() {
  const [mode, setMode] = useState<AnalysisMode | null>(null);

  const video = useVideoFile();
  const csv = useCsvImport();
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [fpsOverride, setFpsOverride] = useState(DEFAULT_ASSUMED_FPS);
  const effectiveFps = videoMetadata?.detectedFps ?? fpsOverride;

  const [subjectId, setSubjectId] = useState("");
  const [trialNameInput, setTrialNameInput] = useState("");
  const derivedTrialName = (video.file?.name ?? csv.parsed?.fileName ?? "trial").replace(/\.[^.]+$/, "");
  const trialName = trialNameInput || derivedTrialName;

  const videoRef = useRef<HTMLVideoElement>(null);
  const playback = useVideoPlayback(videoRef, effectiveFps, video.objectUrl);
  const zoomPan = useZoomPan();

  const analysisSettings = useAnalysisSettings();

  const csvDurationSec = csv.validation?.durationSec ?? null;
  const videoDurationSec = videoMetadata?.durationSec ?? null;
  const sync = useSync(videoDurationSec, csvDurationSec);

  const eventsState = useEvents(videoDurationSec, csvDurationSec);
  const stepTrialsState = useStepTrials(videoDurationSec, csvDurationSec);

  useVideoKeyboardShortcuts({
    onTogglePlay: playback.togglePlay,
    onStepFrames: playback.stepFrames,
    onZoomIn: zoomPan.zoomIn,
    onZoomOut: zoomPan.zoomOut,
    onResetView: zoomPan.reset,
  });

  const [strideRangeSelection, setStrideRangeSelection] = useState<StrideRangeSelection | null>(null);
  const [minPeakProminenceCmOverride, setMinPeakProminenceCmOverride] = useState<number | null>(null);
  const gaitPhaseTiming = useGaitPhaseTiming(eventsState.events);
  const strideWaveform = useStrideWaveform(csv.parsed, csv.mapping, analysisSettings.settings);
  const strideResults = useStrideRangeResults(
    strideWaveform,
    strideRangeSelection,
    sync.toVideoTime,
    minPeakProminenceCmOverride,
  );
  const handleStrideRangeSelectionChange = useCallback((range: StrideRangeSelection | null) => {
    setStrideRangeSelection(range);
    setMinPeakProminenceCmOverride(null);
  }, []);
  const stepResults = useStepResults(csv.parsed, csv.mapping, analysisSettings.settings, stepTrialsState.trials);

  const canRegisterEvents =
    Boolean(video.objectUrl) && Boolean(csv.parsed) && !csv.validation?.hasBlockingError;

  // 要件定義書15.3：未保存の解析状態を検出する(最後の保存／読込時点からの差分)。
  // ref.currentの更新は再レンダリングを起こさないため、beforeunloadリスナーが古いhasUnsavedChangesを
  // 参照し続けるバグになる。保存直後もクリーン判定が即座に反映されるよう、stateとして保持する。
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const currentSnapshot = dirtySnapshot(eventsState.events, stepTrialsState.trials);
  const hasUnsavedChanges =
    savedSnapshot !== null
      ? currentSnapshot !== savedSnapshot
      : eventsState.events.length > 0 || stepTrialsState.trials.length > 0;
  useUnsavedChangesWarning(hasUnsavedChanges);

  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(
      "未保存の解析状態（イベント・ステップ試行など）があります。ファイルを変更すると復元できなくなる可能性があります。続行しますか？",
    );
  }, [hasUnsavedChanges]);

  const guardedCsv: CsvImportState = useMemo(
    () => ({
      ...csv,
      loadFile: async (file: File) => {
        if (!confirmDiscardIfDirty()) return;
        await csv.loadFile(file);
      },
    }),
    [csv, confirmDiscardIfDirty],
  );

  const handleSelectVideoFile = useCallback(
    (file: File) => {
      if (!confirmDiscardIfDirty()) return;
      video.selectFile(file);
    },
    [confirmDiscardIfDirty, video],
  );

  const buildCurrentSaveState = useCallback(
    (): SavedAnalysisState =>
      buildSaveState({
        subjectId,
        trialName,
        videoFile: video.file,
        videoMetadata,
        parsedCsv: csv.parsed,
        csvValidation: csv.validation,
        columnMapping: csv.mapping,
        bodyMeasurements: analysisSettings.settings,
        events: eventsState.events,
        stepTrials: stepTrialsState.trials,
        isTimeEstimated: csv.isTimeEstimated,
        assumedSampleRateHz: csv.assumedSampleRateHz,
      }),
    [
      subjectId,
      trialName,
      video.file,
      videoMetadata,
      csv.parsed,
      csv.validation,
      csv.mapping,
      csv.isTimeEstimated,
      csv.assumedSampleRateHz,
      analysisSettings.settings,
      eventsState.events,
      stepTrialsState.trials,
    ],
  );

  const handleSaved = useCallback(() => {
    setSavedSnapshot(currentSnapshot);
  }, [currentSnapshot]);

  const handleApplyLoadedState = useCallback(
    (data: SavedAnalysisState) => {
      setSubjectId(data.subjectId);
      setTrialNameInput(data.trialName);
      analysisSettings.setThighLength(data.bodyMeasurements.thighLength);
      analysisSettings.setShankLength(data.bodyMeasurements.shankLength);
      analysisSettings.setPelvisWidth(data.bodyMeasurements.pelvisWidth);
      analysisSettings.setLengthUnit(data.bodyMeasurements.lengthUnit);
      eventsState.replaceEvents(data.events);
      stepTrialsState.replaceTrials(data.stepTrials);
      if (csv.parsed) {
        (Object.entries(data.csv.columnMapping) as [CsvColumnKey, string | null][]).forEach(
          ([key, header]) => {
            // 時刻列が推定値だった場合、保存された合成列名をそのまま割り当てても
            // 再選択したCSVには存在しないため、applySyntheticTimeで作り直す。
            if (key === "time") return;
            csv.setColumnMapping(key, header);
          },
        );
        if (data.csv.isTimeEstimated && data.csv.assumedSampleRateHz !== null) {
          csv.applySyntheticTime(data.csv.assumedSampleRateHz);
        } else {
          csv.setColumnMapping("time", data.csv.columnMapping.time);
        }
      }
      setSavedSnapshot(dirtySnapshot(data.events, data.stepTrials));
    },
    [analysisSettings, eventsState, stepTrialsState, csv],
  );

  const sharedSetupPanel = (
    <div className="app-main__side-top">
      <FileImportPanel
        onSelectVideoFile={handleSelectVideoFile}
        videoFileName={video.file?.name ?? null}
        videoMetadata={videoMetadata}
        fpsOverride={fpsOverride}
        onFpsOverrideChange={setFpsOverride}
        csv={guardedCsv}
      />
      <hr />
      <BodyMeasurementsForm state={analysisSettings} />
      <hr />
      <h3>同期情報</h3>
      <SyncInfoPanel sync={sync} currentVideoTimeSec={playback.currentTimeSec} />
      <hr />
      <h3>保存・再読込</h3>
      <SaveLoadPanel
        subjectId={subjectId}
        onSubjectIdChange={setSubjectId}
        trialName={trialNameInput}
        onTrialNameChange={setTrialNameInput}
        buildCurrentSaveState={buildCurrentSaveState}
        currentVideoFile={video.file ? { fileName: video.file.name, fileSizeBytes: video.file.size } : null}
        currentCsvFile={
          csv.parsed ? { fileName: csv.parsed.fileName, fileSizeBytes: csv.parsed.fileSizeBytes } : null
        }
        onApply={handleApplyLoadedState}
        onSaved={handleSaved}
      />
    </div>
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>
          動画・CSV連動 歩行／ステップ動作解析 <span className="app-header__version">v{APP_VERSION}</span>
        </h1>
      </header>
      <AppInfoPanel />

      {mode === null ? (
        <ModeSelectPage onSelect={setMode} />
      ) : (
        <>
          <nav className="app-mode-nav">
            <button
              type="button"
              className={`app-mode-nav__tab${mode === "gait" ? " app-mode-nav__tab--active" : ""}`}
              onClick={() => setMode("gait")}
            >
              歩行解析
            </button>
            <button
              type="button"
              className={`app-mode-nav__tab${mode === "step" ? " app-mode-nav__tab--active" : ""}`}
              onClick={() => setMode("step")}
            >
              ステップ動作解析
            </button>
            <button type="button" className="app-mode-nav__back" onClick={() => setMode(null)}>
              解析選択に戻る
            </button>
          </nav>

          <main className="app-main">
            <section className="app-main__video">
              <VideoPlayer
                videoRef={videoRef}
                playback={playback}
                zoomPan={zoomPan}
                file={video.file}
                objectUrl={video.objectUrl}
                fps={effectiveFps}
                events={eventsState.events}
                onMetadataLoaded={setVideoMetadata}
              />
              {mode === "gait" ? (
                <div className="app-main__event-registration">
                  <h3>イベント登録</h3>
                  <EventRegistrationButtons
                    eventsState={eventsState}
                    currentVideoTimeSec={playback.currentTimeSec}
                    fps={effectiveFps}
                    disabled={!canRegisterEvents}
                  />
                  {!canRegisterEvents && (
                    <p className="app-main__placeholder">
                      動画とCSV（エラーなし）を読み込むとイベントを登録できます。
                    </p>
                  )}
                </div>
              ) : (
                <div className="app-main__event-registration">
                  <h3>ステップ動作登録</h3>
                  <StepTrialForm
                    state={stepTrialsState}
                    currentVideoTimeSec={playback.currentTimeSec}
                    disabled={!canRegisterEvents}
                  />
                </div>
              )}
            </section>
            <aside className="app-main__side">
              {sharedSetupPanel}
              <div className="app-main__side-bottom">
                {mode === "gait" ? (
                  <>
                    <h3>登録イベント一覧</h3>
                    <EventList eventsState={eventsState} />
                    <hr />
                    <h3>歩幅波形</h3>
                    <StrideWaveformPanel
                      state={strideWaveform}
                      events={eventsState.events}
                      selection={strideRangeSelection}
                      onSelectionChange={handleStrideRangeSelectionChange}
                      strideResults={strideResults}
                      minPeakProminenceCmOverride={minPeakProminenceCmOverride}
                      onMinPeakProminenceCmOverrideChange={setMinPeakProminenceCmOverride}
                    />
                    <hr />
                    <h3>歩幅結果</h3>
                    <StrideResultsPanel state={strideResults} />
                    <hr />
                    <h3>歩行周期・ケイデンス</h3>
                    <GaitPhaseTimingPanel state={gaitPhaseTiming} />
                    <hr />
                    <ExportButtons
                      scope="gait"
                      events={eventsState.events}
                      strideResults={strideResults}
                      gaitPhaseTiming={gaitPhaseTiming}
                      trialName={trialName}
                    />
                  </>
                ) : (
                  <>
                    <h3>ステップ動作結果</h3>
                    <StepResultsPanel trialsState={stepTrialsState} resultsState={stepResults} />
                    <hr />
                    <ExportButtons scope="step" stepResults={stepResults} trialName={trialName} />
                  </>
                )}
              </div>
            </aside>
          </main>
        </>
      )}
    </div>
  );
}
