import { useCallback, useEffect, useState, type RefObject } from "react";

export interface VideoPlaybackState {
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  playbackRate: number;
  togglePlay: () => void;
  setPlaybackRate: (rate: number) => void;
  stepFrames: (frames: number) => void;
  seekToSec: (sec: number) => void;
}

export const PLAYBACK_RATE_OPTIONS = [0.25, 0.5, 1.0] as const;

/**
 * 要件定義書6章の動画操作要件（再生・コマ送り・シーク）をHTMLVideoElement経由で提供する。
 *
 * videoSourceKeyには動画のObject URL等、動画が選択されたときに変化する値を渡すこと。
 * `<video>`要素はobjectUrlがある場合のみ描画されるため、mount時点ではvideoRef.currentが
 * まだnullであり、videoRef自体（参照の同一性は変化しない）だけを依存配列に置いても
 * リスナー登録のuseEffectは再実行されず、play/pause/timeupdateが一切反映されなくなる。
 */
export function useVideoPlayback(
  videoRef: RefObject<HTMLVideoElement>,
  fps: number,
  videoSourceKey: string | null,
): VideoPlaybackState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTimeSec(video.currentTime);
    const handleLoadedMetadata = () => {
      setDurationSec(video.duration);
      setCurrentTimeSec(video.currentTime);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef, videoSourceKey]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, [videoRef]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (video) video.playbackRate = rate;
      setPlaybackRateState(rate);
    },
    [videoRef],
  );

  /**
   * 技術提案書6.2：固定fps動画では1フレーム相当時間を1/fpsとしてcurrentTimeを更新する。
   * ブラウザのシークはデコード可能時刻へ丸められる可能性があるため、
   * 動画時刻を主情報、推定フレーム番号を補助情報として扱う（要件定義書6章）。
   */
  const stepFrames = useCallback(
    (frames: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      const frameDurationSec = 1 / fps;
      const next = video.currentTime + frames * frameDurationSec;
      video.currentTime = Math.min(Math.max(next, 0), video.duration || next);
    },
    [videoRef, fps],
  );

  const seekToSec = useCallback(
    (sec: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.min(Math.max(sec, 0), video.duration || sec);
    },
    [videoRef],
  );

  return {
    isPlaying,
    currentTimeSec,
    durationSec,
    playbackRate,
    togglePlay,
    setPlaybackRate,
    stepFrames,
    seekToSec,
  };
}
