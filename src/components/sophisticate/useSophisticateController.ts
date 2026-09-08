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
  } = useLogState();

  const {
    activePreset,
    applyCustomRatio,
    applyPreset,
    applyPresetCrop,
    crop,
    cropAspect,
    cropEnabled,
    customH,
    customW,
    onCropComplete,
    resetCrop,
    setActivePreset,
    setCrop,
    setCropEnabled,
    setCustomH,
    setCustomW,
    setShowCirclePreview,
    setUiCrop,
    setVideoDims,
    setZoom,
    showCirclePreview,
    uiCrop,
    videoDims,
    zoom,
    zoomStep,
  } = useCropState();

  const getPreviewVideo = useCallback(() => {
    return cropperVideoRef.current?.current ?? null;
  }, []);

  const setPreviewVideoRef = useCallback((ref: React.RefObject<HTMLVideoElement>) => {
    cropperVideoRef.current = ref;
  }, []);

  const {
    cleanupRaf,
    currentTime,
    fmtTime,
    handlePreviewPause,
    handlePreviewPlay,
    handlePreviewTimeUpdate,
    isPreviewPlaying,
    loopEnabled,
    resetPlayback,
    resetTrimRange,
    seekPreview,
    setCurrentTime,
    setLoopEnabled,
    setSpeed,
    setTrimEnd,
    setTrimRange,
    setTrimStart,
    setVideoDuration,
    speed,
    togglePreviewPlayback,
    trimEnd,
    trimStart,
    videoDuration,
  } = usePlaybackState(getPreviewVideo);

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

      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setUiCrop({ x: 0, y: 0 });
      setZoom(1);
      resetPlayback();
      setShowCirclePreview(false);
    },
    [addLog, resetPlayback, setCrop, setShowCirclePreview, setUiCrop, setZoom],
  );

  const clearAll = useCallback(() => {
    setFileName("");
    setFileMeta({ size: 0, type: "" });
    setProgress(0);
    resetLogs();
    resetCrop();
    setShowResult(false);
    resetPlayback();
    fileRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);
  }, [resetCrop, resetLogs, resetPlayback]);

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
      const w = mediaSize?.naturalWidth || videoEl?.videoWidth || 0;
      const h = mediaSize?.naturalHeight || videoEl?.videoHeight || 0;
      if (!w || !h) return;

      setVideoDims({ w, h });
      const duration = videoEl?.duration || 0;
      setVideoDuration(duration);
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(duration);
      addLog(`[meta] ${w}x${h}, ${duration.toFixed(1)}s`);

      const preset = ASPECT_PRESETS.find((p) => p.label === activePreset) ?? ASPECT_PRESETS[0];
      setCrop(applyPresetCrop(preset, w, h));
    },
    [
      activePreset,
      addLog,
      applyPresetCrop,
      getPreviewVideo,
      setCrop,
      setCurrentTime,
      setTrimEnd,
      setTrimStart,
      setVideoDims,
      setVideoDuration,
    ],
  );

  // --- Processing ---
  const realProcess = useCallback(async () => {
    if (!fileName || !fileRef.current) return;

    if (videoDims.w <= 0 || videoDims.h <= 0) {
      addLog("[error] video metadata not loaded");
      return;
    }

    setProcessing(true);
    auroraSignal.paused = true;
    cancelRequestedRef.current = false;
    setProgress(0);
    setShowResult(false);

    const effectiveCrop = cropEnabled ? crop : undefined;
    const px = effectiveCrop ? cropPixels(effectiveCrop, videoDims.w, videoDims.h) : null;
    setLogs([
      "[run] start",
      `[run] max size=${sizeLimitEnabled ? maxSize : "unlimited"} MB, format=${format}, audio=${includeAudio ? "on" : "off"}`,
      `[run] crop ${px ? `${px.w}x${px.h}+${px.x}+${px.y}` : "disabled"} from ${videoDims.w}x${videoDims.h}`,
    ]);

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);

    try {
      const { processVideo } = await import("@/lib/processVideo");
      const blob = await processVideo(fileRef.current, {
        crop: effectiveCrop,
        maxSizeMB: sizeLimitEnabled ? parseFloat(maxSize) || 0.49 : undefined,
        format,
        videoWidth: videoDims.w,
        videoHeight: videoDims.h,
        duration: videoDuration || 1,
        onLog: addLog,
        onProgress: setProgress,
        trimStart: trimStart > 0 ? trimStart : undefined,
        trimEnd: trimEnd > 0 && trimEnd < (videoDuration || 0) ? trimEnd : undefined,
        speed: speed !== 1 ? speed : undefined,
        loop: loopEnabled ? 2 : 1,
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
    crop,
    cropEnabled,
    fileName,
    format,
    fps,
    includeAudio,
    loopEnabled,
    maxSize,
    quality,
    setLogs,
    sizeLimitEnabled,
    speed,
    trimEnd,
    trimStart,
    videoDims.h,
    videoDims.w,
    videoDuration,
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
    if (!isPreviewPlaying) return;
    if (trimEnd <= trimStart) return;
    if (currentTime < trimEnd) return;

    const previewVideo = getPreviewVideo();
    if (!previewVideo) return;

    previewVideo.pause();
    previewVideo.currentTime = trimEnd;
    setCurrentTime(trimEnd);
  }, [currentTime, getPreviewVideo, isPreviewPlaying, setCurrentTime, trimEnd, trimStart]);

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

  const cropPx = videoDims.w > 0 ? cropPixels(crop, videoDims.w, videoDims.h) : null;
  const cropLabel = cropPx ? `${cropPx.w}×${cropPx.h} from ${videoDims.w}×${videoDims.h}` : "Load a video first";

  // --- Public API (same shape as before) ---
  return {
    inputRef,
    logsEndRef,
    fileUrl,
    fileName,
    maxSize,
    format,
    crop,
    activePreset,
    showResult,
    videoDuration,
    currentTime,
    trimStart,
    trimEnd,
    isPreviewPlaying,
    speed,
    loopEnabled,
    fps,
    quality,
    includeAudio,
    showCirclePreview,
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
    uiCrop,
    zoom,
    zoomStep,
    cropAspect,
    setUiCrop,
    setZoom,
    setTrimStart,
    setTrimEnd,
    setShowResult,
    clearAll,
    handleDropFiles,
    handlePick,
    handlePaste,
    handleVideoMetadata,
    setPreviewVideoRef,
    handlePreviewTimeUpdate,
    handlePreviewPlay,
    handlePreviewPause,
    onCropComplete,
    realProcess,
    stopCurrentProcess,
    handleDownload,
    seekPreview,
    setTrimRange,
    resetTrimRange,
    togglePreviewPlayback,
    setShowCirclePreview,
    setLogFilter,
    setLogQuery,
    setMaxSize,
    setFormat,
    setCrop,
    setActivePreset,
    setSpeed,
    setLoopEnabled,
    setFps,
    setQuality,
    setIncludeAudio,
    applyPreset,
    applyCustomRatio,
    customW,
    customH,
    setCustomW,
    setCustomH,
    cropEnabled,
    setCropEnabled,
    sizeLimitEnabled,
    setSizeLimitEnabled,
    fmtTime,
  };
}

export type SophisticateController = ReturnType<typeof useSophisticateController>;
