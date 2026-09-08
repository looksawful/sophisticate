"use client";

import { cropPixels, prettyBytes } from "@/lib/videoUtils";
import { useCallback, useEffect, useRef, useState } from "react";

import { auroraSignal } from "../auroraSignal";
import { ASPECT_PRESETS } from "./config";
import { useCropState } from "./hooks/useCropState";
import { useLogState } from "./hooks/useLogState";
import { usePlaybackState } from "./hooks/usePlaybackState";

export function useSophisticateController() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const cropperVideoRef = useRef<React.RefObject<HTMLVideoElement> | null>(null);

  // --- File state ---
  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState({ size: 0, type: "" });
  const [fileUrl, setFileUrl] = useState("");
  const fileUrlRef = useRef("");
  const fileRef = useRef<File | null>(null);

  // --- Output state ---
  const [showResult, setShowResult] = useState(false);
  const [maxSize, setMaxSize] = useState("0.49");
  const [format, setFormat] = useState<"MP4" | "WEBM">("MP4");
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [sizeLimitEnabled, setSizeLimitEnabled] = useState(true);

  // --- Processing state ---
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const resultUrlRef = useRef("");
  const cancelRequestedRef = useRef(false);

  // --- Composed hooks ---
  const logState = useLogState();
  const cropState = useCropState();
  const {
    addLog,
    filteredLogs,
    logFilter,
    logQuery,
    logs,
    resetLogs,
    setLogFilter,
    setLogQuery,
    setLogs,
  } = logState;

  const getPreviewVideo = useCallback(() => {
    return cropperVideoRef.current?.current ?? null;
  }, []);

  const setPreviewVideoRef = useCallback((ref: React.RefObject<HTMLVideoElement>) => {
    cropperVideoRef.current = ref;
  }, []);

  const playbackState = usePlaybackState(getPreviewVideo);
  const cleanupRaf = playbackState.cleanupRaf;

  const canConvert = !!fileName && !processing;

  // --- File management ---
  const setFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setFileMeta({ size: file.size, type: file.type || "" });
      addLog(`[input] file: ${file.name} (${prettyBytes(file.size)})`);
      fileRef.current = file;

      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      fileUrlRef.current = objectUrl;
      setFileUrl(objectUrl);

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
      setResultUrl("");
      setResultBlob(null);
      setShowResult(false);

      cropState.setCrop({ x: 0, y: 0, w: 1, h: 1 });
      cropState.setUiCrop({ x: 0, y: 0 });
      cropState.setZoom(1);
      playbackState.resetPlayback();
      cropState.setShowCirclePreview(false);
    },
    [
      addLog,
      cropState.setCrop,
      cropState.setUiCrop,
      cropState.setZoom,
      cropState.setShowCirclePreview,
      playbackState.resetPlayback,
    ],
  );

  const clearAll = useCallback(() => {
    setFileName("");
    setFileMeta({ size: 0, type: "" });
    setProgress(0);
    resetLogs();
    cropState.resetCrop();
    setShowResult(false);
    playbackState.resetPlayback();
    fileRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);
  }, [resetLogs, cropState.resetCrop, playbackState.resetPlayback]);

  const handleDropFiles = useCallback(
    (files: File[]) => {
      const file = files?.[0];
      if (file) setFile(file);
    },
    [setFile],
  );

  const handlePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setFile(file);
      e.target.value = "";
    },
    [setFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file) continue;
        setFile(file);
        addLog("[input] pasted file from clipboard");
        break;
      }
    },
    [addLog, setFile],
  );

  // --- Video metadata ---
  // NOTE: react-easy-crop overrides onLoadedMetadata from mediaProps internally,
  // so we use the onMediaLoaded prop instead (which receives {naturalWidth, naturalHeight}).
  const handleVideoMetadata = useCallback(
    (mediaSize?: { naturalWidth: number; naturalHeight: number }) => {
      const videoEl = getPreviewVideo();

      // Prefer mediaSize from react-easy-crop's onMediaLoaded; fall back to video element
      const w = mediaSize?.naturalWidth || videoEl?.videoWidth || 0;
      const h = mediaSize?.naturalHeight || videoEl?.videoHeight || 0;
      if (!w || !h) return;

      cropState.setVideoDims({ w, h });
      const duration = videoEl?.duration || 0;
      playbackState.setVideoDuration(duration);
      playbackState.setCurrentTime(0);
      playbackState.setTrimStart(0);
      playbackState.setTrimEnd(duration);
      addLog(`[meta] ${w}x${h}, ${duration.toFixed(1)}s`);

      const preset = ASPECT_PRESETS.find((p) => p.label === cropState.activePreset) ?? ASPECT_PRESETS[0];
      cropState.setCrop(cropState.applyPresetCrop(preset, w, h));
    },
    [
      cropState.activePreset,
      addLog,
      cropState.applyPresetCrop,
      getPreviewVideo,
      cropState.setVideoDims,
      cropState.setCrop,
      playbackState.setVideoDuration,
      playbackState.setCurrentTime,
      playbackState.setTrimStart,
      playbackState.setTrimEnd,
    ],
  );

  // --- Processing ---
  const realProcess = useCallback(async () => {
    if (!fileName || !fileRef.current) return;

    if (cropState.videoDims.w <= 0 || cropState.videoDims.h <= 0) {
      addLog("[error] video metadata not loaded");
      return;
    }

    setProcessing(true);
    auroraSignal.paused = true;
    cancelRequestedRef.current = false;
    setProgress(0);
    setShowResult(false);

    const effectiveCrop = cropState.cropEnabled ? cropState.crop : { x: 0, y: 0, w: 1, h: 1 };
    const px = cropPixels(effectiveCrop, cropState.videoDims.w, cropState.videoDims.h);
    setLogs([
      "[run] start",
      `[run] max size=${sizeLimitEnabled ? maxSize : "unlimited"} MB, format=${format}, audio=${includeAudio ? "on" : "off"}`,
      `[run] crop ${cropState.cropEnabled ? `${px.w}x${px.h}+${px.x}+${px.y}` : "disabled"} from ${cropState.videoDims.w}x${cropState.videoDims.h}`,
    ]);

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);

    try {
      const { processVideo } = await import("@/lib/processVideo");
      const blob = await processVideo(fileRef.current, {
        crop: effectiveCrop,
        maxSizeMB: sizeLimitEnabled ? parseFloat(maxSize) || 0.49 : 9999,
        format,
        videoWidth: cropState.videoDims.w,
        videoHeight: cropState.videoDims.h,
        duration: playbackState.videoDuration || 1,
        onLog: addLog,
        onProgress: setProgress,
        trimStart: playbackState.trimStart > 0 ? playbackState.trimStart : undefined,
        trimEnd:
          playbackState.trimEnd > 0 && playbackState.trimEnd < (playbackState.videoDuration || 0)
            ? playbackState.trimEnd
            : undefined,
        speed: playbackState.speed !== 1 ? playbackState.speed : undefined,
        loop: playbackState.loopEnabled ? 2 : 1,
        fps: fps > 0 ? fps : undefined,
        quality,
        includeAudio,
      });

      setResultBlob(blob);
      const objectUrl = URL.createObjectURL(blob);
      resultUrlRef.current = objectUrl;
      setResultUrl(objectUrl);
      setShowResult(true);
      addLog(`[complete] ${prettyBytes(blob.size)} — ready to download`);
    } catch (err) {
      if (cancelRequestedRef.current) {
        addLog("[cancelled] processing stopped");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`[error] ${msg}`);
      }
    } finally {
      setProcessing(false);
      auroraSignal.paused = false;
      cancelRequestedRef.current = false;
    }
  }, [
    addLog,
    setLogs,
    cropState.crop,
    cropState.cropEnabled,
    cropState.videoDims.w,
    cropState.videoDims.h,
    fileName,
    format,
    fps,
    includeAudio,
    playbackState.loopEnabled,
    maxSize,
    quality,
    sizeLimitEnabled,
    playbackState.speed,
    playbackState.trimEnd,
    playbackState.trimStart,
    playbackState.videoDuration,
  ]);

  const stopCurrentProcess = useCallback(async () => {
    if (!processing) return;
    cancelRequestedRef.current = true;
    addLog("[run] stopping...");
    const { stopProcessing } = await import("@/lib/processVideo");
    stopProcessing();
  }, [addLog, processing]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const href = resultUrlRef.current || URL.createObjectURL(resultBlob);
    const ext = format === "WEBM" ? ".webm" : ".mp4";
    const base = fileName.replace(/\.[^.]+$/, "") || "video";
    const link = document.createElement("a");
    link.href = href;
    link.download = `${base}_sophisticate${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [fileName, format, resultBlob]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isEditableTarget =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        inputRef.current?.click();
      }
      if (e.key === "Enter" && canConvert && !isEditableTarget) {
        realProcess();
      }
      if (e.key === "Escape" && !isEditableTarget) {
        clearAll();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canConvert, clearAll, realProcess]);

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      cleanupRaf();
    };
  }, [cleanupRaf]);

  // --- Trim boundary enforcement ---
  useEffect(() => {
    if (!playbackState.isPreviewPlaying) return;
    if (playbackState.trimEnd <= playbackState.trimStart) return;
    if (playbackState.currentTime < playbackState.trimEnd) return;

    const previewVideo = getPreviewVideo();
    if (!previewVideo) return;

    previewVideo.pause();
    previewVideo.currentTime = playbackState.trimEnd;
    playbackState.setCurrentTime(playbackState.trimEnd);
  }, [
    playbackState.currentTime,
    getPreviewVideo,
    playbackState.isPreviewPlaying,
    playbackState.trimEnd,
    playbackState.trimStart,
    playbackState.setCurrentTime,
  ]);

  // --- Log auto-scroll ---
  useEffect(() => {
    const el = logsEndRef.current;
    if (!el) return;
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => el.scrollIntoView({ behavior: "auto" }));
      return () => cancelIdleCallback(id);
    }
    el.scrollIntoView({ behavior: "auto" });
  }, [logs]);

  // --- Derived state ---
  const fileBadge = fileName
    ? `${prettyBytes(fileMeta.size)}${fileMeta.type ? ` — ${fileMeta.type}` : ""}`
    : "No file selected";

  const cropPx =
    cropState.videoDims.w > 0 ? cropPixels(cropState.crop, cropState.videoDims.w, cropState.videoDims.h) : null;
  const cropLabel = cropPx
    ? `${cropPx.w}×${cropPx.h} from ${cropState.videoDims.w}×${cropState.videoDims.h}`
    : "Load a video first";

  // --- Public API (same shape as before) ---
  return {
    inputRef,
    logsEndRef,
    fileUrl,
    fileName,
    maxSize,
    format,
    crop: cropState.crop,
    activePreset: cropState.activePreset,
    showResult,
    videoDuration: playbackState.videoDuration,
    currentTime: playbackState.currentTime,
    trimStart: playbackState.trimStart,
    trimEnd: playbackState.trimEnd,
    isPreviewPlaying: playbackState.isPreviewPlaying,
    speed: playbackState.speed,
    loopEnabled: playbackState.loopEnabled,
    fps,
    quality,
    includeAudio,
    showCirclePreview: cropState.showCirclePreview,
    logs,
    filteredLogs,
    logFilter,
    logQuery,
    processing,
    progress,
    resultBlob,
    resultUrl,
    canConvert,
    fileBadge,
    cropPx,
    cropLabel,
    uiCrop: cropState.uiCrop,
    zoom: cropState.zoom,
    zoomStep: cropState.zoomStep,
    cropAspect: cropState.cropAspect,
    setUiCrop: cropState.setUiCrop,
    setZoom: cropState.setZoom,
    setTrimStart: playbackState.setTrimStart,
    setTrimEnd: playbackState.setTrimEnd,
    setShowResult,
    clearAll,
    handleDropFiles,
    handlePick,
    handlePaste,
    handleVideoMetadata,
    setPreviewVideoRef,
    handlePreviewTimeUpdate: playbackState.handlePreviewTimeUpdate,
    handlePreviewPlay: playbackState.handlePreviewPlay,
    handlePreviewPause: playbackState.handlePreviewPause,
    onCropComplete: cropState.onCropComplete,
    realProcess,
    stopCurrentProcess,
    handleDownload,
    seekPreview: playbackState.seekPreview,
    setTrimRange: playbackState.setTrimRange,
    resetTrimRange: playbackState.resetTrimRange,
    togglePreviewPlayback: playbackState.togglePreviewPlayback,
    setShowCirclePreview: cropState.setShowCirclePreview,
    setLogFilter,
    setLogQuery,
    setMaxSize,
    setFormat,
    setCrop: cropState.setCrop,
    setActivePreset: cropState.setActivePreset,
    setSpeed: playbackState.setSpeed,
    setLoopEnabled: playbackState.setLoopEnabled,
    setFps,
    setQuality,
    setIncludeAudio,
    applyPreset: cropState.applyPreset,
    applyCustomRatio: cropState.applyCustomRatio,
    customW: cropState.customW,
    customH: cropState.customH,
    setCustomW: cropState.setCustomW,
    setCustomH: cropState.setCustomH,
    cropEnabled: cropState.cropEnabled,
    setCropEnabled: cropState.setCropEnabled,
    sizeLimitEnabled,
    setSizeLimitEnabled,
    fmtTime: playbackState.fmtTime,
  };
}

export type SophisticateController = ReturnType<typeof useSophisticateController>;
