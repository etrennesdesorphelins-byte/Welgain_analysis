import { PLAYBACK_RATE_OPTIONS, type VideoPlaybackState } from "./useVideoPlayback";
import type { ZoomPanState } from "./useZoomPan";
import type { GaitEvent, GaitEventType } from "../../domain/events";

interface VideoControlsProps {
  playback: VideoPlaybackState;
  zoomPan: ZoomPanState;
  fps: number;
  events?: GaitEvent[];
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0.000";
  return sec.toFixed(3);
}

/** 要件定義書8.2：右・左およびIC・Offを色・形で区別する（色のみに依存しない）。 */
function markerClassName(type: GaitEventType): string {
  const side = type.startsWith("Rt") ? "rt" : "lt";
  const kind = type.endsWith("IC") ? "ic" : "off";
  return `event-marker event-marker--${side} event-marker--${kind}`;
}

export function VideoControls({ playback, zoomPan, fps, events = [] }: VideoControlsProps) {
  const estimatedFrame = Math.round(playback.currentTimeSec * fps);
  const durationSec = playback.durationSec || 0;

  return (
    <div className="video-controls">
      <div className="video-controls__row">
        <button type="button" onClick={playback.togglePlay}>
          {playback.isPlaying ? "一時停止" : "再生"}
        </button>

        <button type="button" onClick={() => playback.stepFrames(-10)}>
          ◀◀ 10コマ
        </button>
        <button type="button" onClick={() => playback.stepFrames(-1)}>
          ◀ 1コマ
        </button>
        <button type="button" onClick={() => playback.stepFrames(1)}>
          1コマ ▶
        </button>
        <button type="button" onClick={() => playback.stepFrames(10)}>
          10コマ ▶▶
        </button>

        <label>
          再生速度
          <select
            value={playback.playbackRate}
            onChange={(e) => playback.setPlaybackRate(Number(e.target.value))}
          >
            {PLAYBACK_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}倍
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="video-controls__row">
        <div className="video-controls__seek-wrapper">
          <input
            type="range"
            min={0}
            max={durationSec}
            step={1 / fps}
            value={playback.currentTimeSec}
            onChange={(e) => playback.seekToSec(Number(e.target.value))}
            className="video-controls__seek-bar"
          />
          <div className="video-controls__markers">
            {events.map((event) => (
              <span
                key={event.id}
                className={markerClassName(event.type)}
                style={{
                  left: durationSec > 0 ? `${(event.videoTimeSec / durationSec) * 100}%` : "0%",
                }}
                title={`${event.type} @ ${formatTime(event.videoTimeSec)}秒`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="video-controls__row video-controls__status">
        <span>
          動画時刻: {formatTime(playback.currentTimeSec)} / {formatTime(playback.durationSec)} 秒
        </span>
        <span>推定フレーム番号: {estimatedFrame}</span>
      </div>

      <div className="video-controls__row">
        <button type="button" onClick={zoomPan.zoomOut}>
          縮小 (−)
        </button>
        <span>{Math.round(zoomPan.scale * 100)}%</span>
        <button type="button" onClick={zoomPan.zoomIn}>
          拡大 (+)
        </button>
        <button type="button" onClick={zoomPan.reset}>
          表示リセット (R)
        </button>
      </div>
    </div>
  );
}
