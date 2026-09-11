import { useCallback, useEffect, useState, type PointerEvent, type RefObject } from "react";
import type { VideoMetadata } from "../../domain/video";
import type { GaitEvent } from "../../domain/events";
import type { VideoPlaybackState } from "./useVideoPlayback";
import type { ZoomPanState } from "./useZoomPan";
import { VideoControls } from "./VideoControls";

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement>;
  playback: VideoPlaybackState;
  zoomPan: ZoomPanState;
  file: File | null;
  objectUrl: string | null;
  fps: number;
  events?: GaitEvent[];
  onMetadataLoaded: (meta: VideoMetadata) => void;
}

export function VideoPlayer({
  videoRef,
  playback,
  zoomPan,
  file,
  objectUrl,
  fps,
  events,
  onMetadataLoaded,
}: VideoPlayerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !file) return;

    setLoadError(null);

    function handleLoadedMetadata() {
      if (!video || !file) return;
      onMetadataLoaded({
        fileName: file.name,
        fileSizeBytes: file.size,
        durationSec: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        // ブラウザ標準APIではソース動画のfpsを取得できないため、常にnull。
        detectedFps: null,
        assumedFps: fps,
      });
    }

    // 要件定義書17章：再生できない場合も画面全体を止めず、原因を理解できるメッセージを表示する。
    // 代表例：推奨コーデック（H.264）以外（例：HEVC）はブラウザによってはデコードできない。
    function handleError() {
      setLoadError(
        "動画を再生できません。ブラウザが対応していないコーデックの可能性があります（推奨コーデック：H.264）。",
      );
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, file, objectUrl]);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (zoomPan.scale <= 1) return;
      setIsDragging(true);
      setDragOrigin({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [zoomPan.scale],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - dragOrigin.x;
      const dy = e.clientY - dragOrigin.y;
      setDragOrigin({ x: e.clientX, y: e.clientY });
      zoomPan.pan(dx, dy);
    },
    [isDragging, dragOrigin, zoomPan],
  );

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  if (!objectUrl) {
    return <div className="video-player video-player--empty">動画ファイルを選択してください</div>;
  }

  return (
    <div className="video-player">
      {loadError && <p className="video-player__error">{loadError}</p>}
      <div
        className="video-player__viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: zoomPan.scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        <video
          ref={videoRef}
          src={objectUrl}
          className="video-player__video"
          style={{
            transform: `translate(${zoomPan.offsetX}px, ${zoomPan.offsetY}px) scale(${zoomPan.scale})`,
          }}
        />
      </div>
      <VideoControls playback={playback} zoomPan={zoomPan} fps={fps} events={events} />
    </div>
  );
}
