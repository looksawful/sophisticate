"use client";

import { useCallback, useRef, useState } from "react";

export function usePlaybackState(getPreviewVideo: () => HTMLVideoElement | null) {
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(true);

  const pendingTimeRef = useRef<number | null>(null);
  const rafTimeRef = useRef(0);

  const seekPreview = useCallback(
    (time: number) => {
      const max = Math.max(0, videoDuration || 0);
      const clamped = Math.max(0, Math.min(time, max));
      setCurrentTime(clamped);
      const previewVideo = getPreviewVideo();
      if (previewVideo) previewVideo.currentTime = clamped;
    },
    [getPreviewVideo, videoDuration],
  );

  const setTrimRange = useCallback(
    (start: number, end: number) => {
      const max = Math.max(0, videoDuration || 0);
      const minGap = 0.1;
      const safeStart = Math.max(0, Math.min(start, max));
      const safeEnd = Math.max(safeStart + minGap, Math.min(end, max));
      setTrimStart(safeStart);
      setTrimEnd(safeEnd);
    },
    [videoDuration],
  );

  const resetTrimRange = useCallback(() => {
    const max = Math.max(0, videoDuration || 0);
    setTrimStart(0);
    setTrimEnd(max);
    seekPreview(0);
  }, [seekPreview, videoDuration]);

  const togglePreviewPlayback = useCallback(async () => {
    const previewVideo = getPreviewVideo();
    if (!previewVideo) return;
    try {
      if (previewVideo.paused) {
        if (previewVideo.currentTime < trimStart || previewVideo.currentTime > trimEnd) {
          previewVideo.currentTime = trimStart;
          setCurrentTime(trimStart);
        }
        await previewVideo.play();
      } else {
        previewVideo.pause();
      }
    } catch {}
  }, [getPreviewVideo, trimEnd, trimStart]);

  const handlePreviewTimeUpdate = useCallback((time: number) => {
    pendingTimeRef.current = time;
    if (rafTimeRef.current) return;
    rafTimeRef.current = requestAnimationFrame(() => {
      rafTimeRef.current = 0;
      if (pendingTimeRef.current !== null) {
        setCurrentTime(pendingTimeRef.current);
        pendingTimeRef.current = null;
      }
    });
  }, []);

  const handlePreviewPlay = useCallback(() => {
    setIsPreviewPlaying(true);
  }, []);

  const handlePreviewPause = useCallback(() => {
    setIsPreviewPlaying(false);
  }, []);

  const fmtTime = useCallback((seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const m = Math.floor(s / 60);
    const rest = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${rest}`;
  }, []);

  const resetPlayback = useCallback(() => {
    setCurrentTime(0);
    setIsPreviewPlaying(false);
    setTrimStart(0);
    setTrimEnd(0);
  }, []);

  const cleanupRaf = useCallback(() => {
    if (rafTimeRef.current) cancelAnimationFrame(rafTimeRef.current);
  }, []);

  return {
    videoDuration,
    setVideoDuration,
    currentTime,
    setCurrentTime,
    trimStart,
    setTrimStart,
    trimEnd,
    setTrimEnd,
    isPreviewPlaying,
    speed,
    setSpeed,
    loopEnabled,
    setLoopEnabled,
    seekPreview,
    setTrimRange,
    resetTrimRange,
    togglePreviewPlayback,
    handlePreviewTimeUpdate,
    handlePreviewPlay,
    handlePreviewPause,
    fmtTime,
    resetPlayback,
    cleanupRaf,
  };
}
