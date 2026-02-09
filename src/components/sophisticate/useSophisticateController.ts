"use client";

import type { Crop } from "@/lib/videoUtils";
import { cropPixels, normalizeCrop, prettyBytes } from "@/lib/videoUtils";
import type { Area } from "react-easy-crop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ASPECT_PRESETS, type AspectPreset } from "./config";

export function useSophisticateController() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const cropperVideoRef = useRef<React.RefObject<HTMLVideoElement> | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState({ size: 0, type: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  const [maxSize, setMaxSize] = useState("0.49");
  const [format, setFormat] = useState<"MP4" | "WEBM">("MP4");

  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [activePreset, setActivePreset] = useState<string>("1:1");
  const [showResult, setShowResult] = useState(false);

  const [uiCrop, setUiCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoomRaw] = useState(1);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [showCirclePreview, setShowCirclePreview] = useState(true);

  const fileUrlRef = useRef("");
  const fileRef = useRef<File | null>(null);
  const [logs, setLogs] = useState<string[]>(["Ready"]);
  const [logFilter, setLogFilter] = useState<"all" | "process" | "errors" | "ffmpeg">("all");
  const [logQuery, setLogQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const resultUrlRef = useRef("");
  const cancelRequestedRef = useRef(false);

  const canConvert = !!fileName && !processing;

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return logs.filter((line) => {
      const byFilter =
        logFilter === "all" ? true :
        logFilter === "errors" ? line.startsWith("[error]") :
        logFilter === "ffmpeg" ? line.startsWith("[ffmpeg]") :
        line.startsWith("[run]") ||
        line.startsWith("[encode]") ||
        line.startsWith("[crop]") ||
        line.startsWith("[size]") ||
        line.startsWith("[done]") ||
        line.startsWith("[complete]") ||
        line.startsWith("[cancelled]");
      if (!byFilter) return false;
      if (!q) return true;
      return line.toLowerCase().includes(q);
    });
  }, [logFilter, logQuery, logs]);

  const cropAspect = useMemo(() => {
    const preset = ASPECT_PRESETS.find((p) => p.label === activePreset);
    if (!preset || preset.w === 0 || preset.h === 0) return undefined;
    return preset.w / preset.h;
  }, [activePreset]);

  const zoomStep = useMemo(() => {
    const minSide = Math.min(videoDims.w, videoDims.h);
    if (minSide >= 2160) return 0.005;
    if (minSide >= 1080) return 0.01;
    if (minSide >= 720) return 0.015;
    return 0.02;
  }, [videoDims.h, videoDims.w]);

  const setZoom = useCallback((nextZoom: number) => {
    const clamped = Math.max(1, Math.min(3, nextZoom));
    const snapped = Math.round(clamped / zoomStep) * zoomStep;
    setZoomRaw(Number(snapped.toFixed(4)));
  }, [zoomStep]);

  const getPreviewVideo = useCallback(() => {
    return cropperVideoRef.current?.current ?? null;
  }, []);

  const setPreviewVideoRef = useCallback((ref: React.RefObject<HTMLVideoElement>) => {
    cropperVideoRef.current = ref;
  }, []);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => {
      const next = prev.length > 900 ? prev.slice(prev.length - 650) : prev;
      return [...next, line];
    });
  }, []);

  const applyPresetCrop = useCallback((preset: AspectPreset, width: number, height: number): Crop => {
    if (preset.w === 0 || preset.h === 0 || width <= 0 || height <= 0) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
    const targetAspect = preset.w / preset.h;
    const videoAspect = width / height;
    let newW: number;
    let newH: number;

    if (targetAspect > videoAspect) {
      newW = 1;
      newH = (width / targetAspect) / height;
    } else {
      newH = 1;
      newW = (height * targetAspect) / width;
    }

    newW = Math.min(1, newW);
    newH = Math.min(1, newH);
    return normalizeCrop({ x: (1 - newW) / 2, y: (1 - newH) / 2, w: newW, h: newH });
  }, []);

  const applyPreset = useCallback(
    (preset: AspectPreset) => {
      setActivePreset(preset.label);
      setUiCrop({ x: 0, y: 0 });
      setZoomRaw(1);
      if (videoDims.w <= 0 || videoDims.h <= 0) {
        setCrop({ x: 0, y: 0, w: 1, h: 1 });
        return;
      }
      setCrop(applyPresetCrop(preset, videoDims.w, videoDims.h));
    },
    [applyPresetCrop, videoDims.h, videoDims.w],
  );

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
      setZoomRaw(1);
      setCurrentTime(0);
      setIsPreviewPlaying(false);
      setTrimStart(0);
      setTrimEnd(0);
      setShowCirclePreview(true);
    },
    [addLog],
  );

  const clearAll = useCallback(() => {
    setFileName("");
    setFileMeta({ size: 0, type: "" });
    setProgress(0);
    setLogs(["Ready"]);
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setVideoDims({ w: 0, h: 0 });
    setShowResult(false);
    setUiCrop({ x: 0, y: 0 });
    setZoomRaw(1);
    setCurrentTime(0);
    setIsPreviewPlaying(false);
    setTrimStart(0);
    setTrimEnd(0);
    setShowCirclePreview(true);
    fileRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);
  }, []);

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

  const handleVideoMetadata = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return;

    setVideoDims({ w: videoEl.videoWidth, h: videoEl.videoHeight });
    const duration = videoEl.duration || 0;
    setVideoDuration(duration);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(duration);
    addLog(`[meta] ${videoEl.videoWidth}x${videoEl.videoHeight}, ${duration.toFixed(1)}s`);

    const preset = ASPECT_PRESETS.find((p) => p.label === activePreset) ?? ASPECT_PRESETS[0];
    setCrop(applyPresetCrop(preset, videoEl.videoWidth, videoEl.videoHeight));
  }, [activePreset, addLog, applyPresetCrop]);

  const onCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      if (videoDims.w <= 0 || videoDims.h <= 0) return;
      const next = normalizeCrop({
        x: croppedAreaPixels.x / videoDims.w,
        y: croppedAreaPixels.y / videoDims.h,
        w: croppedAreaPixels.width / videoDims.w,
        h: croppedAreaPixels.height / videoDims.h,
      });
      setCrop(next);
    },
    [videoDims.h, videoDims.w],
  );

  const realProcess = useCallback(async () => {
    if (!fileName || !fileRef.current) return;

    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      addLog("[error] video metadata not loaded");
      return;
    }

    setProcessing(true);
    cancelRequestedRef.current = false;
    setProgress(0);
    setShowResult(false);

    const px = cropPixels(crop, videoEl.videoWidth, videoEl.videoHeight);
      setLogs([
        "[run] start",
        `[run] max size=${maxSize} MB, format=${format}, audio=${includeAudio ? "on" : "off"}`,
        `[run] crop ${px.w}x${px.h}+${px.x}+${px.y} from ${videoEl.videoWidth}x${videoEl.videoHeight}`,
      ]);

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);

    try {
      const { processVideo } = await import("@/lib/processVideo");
      const blob = await processVideo(fileRef.current, {
        crop,
        maxSizeMB: parseFloat(maxSize) || 0.49,
        format,
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
        duration: videoEl.duration || 1,
        onLog: addLog,
        onProgress: setProgress,
        trimStart: trimStart > 0 ? trimStart : undefined,
        trimEnd: trimEnd > 0 && trimEnd < (videoEl.duration || 0) ? trimEnd : undefined,
        speed: speed !== 1 ? speed : undefined,
        loop: loopCount > 1 ? loopCount : undefined,
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
      cancelRequestedRef.current = false;
    }
  }, [addLog, crop, fileName, format, fps, includeAudio, loopCount, maxSize, quality, speed, trimEnd, trimStart]);

  const stopCurrentProcess = useCallback(async () => {
    if (!processing) return;
    cancelRequestedRef.current = true;
    addLog("[run] stopping...");
    const { stopProcessing } = await import("@/lib/processVideo");
    stopProcessing();
  }, [addLog, processing]);

  const seekPreview = useCallback((time: number) => {
    const max = Math.max(0, videoDuration || 0);
    const clamped = Math.max(0, Math.min(time, max));
    setCurrentTime(clamped);
    const previewVideo = getPreviewVideo();
    if (previewVideo) previewVideo.currentTime = clamped;
  }, [getPreviewVideo, videoDuration]);

  const setTrimRange = useCallback((start: number, end: number) => {
    const max = Math.max(0, videoDuration || 0);
    const minGap = 0.1;
    const safeStart = Math.max(0, Math.min(start, max));
    const safeEnd = Math.max(safeStart + minGap, Math.min(end, max));
    setTrimStart(safeStart);
    setTrimEnd(safeEnd);
  }, [videoDuration]);

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
    setCurrentTime(time);
  }, []);

  const handlePreviewPlay = useCallback(() => {
    setIsPreviewPlaying(true);
  }, []);

  const handlePreviewPause = useCallback(() => {
    setIsPreviewPlaying(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (resultBlob) {
      const href = resultUrlRef.current || URL.createObjectURL(resultBlob);
      const ext = format === "WEBM" ? ".webm" : ".mp4";
      const base = fileName.replace(/\.[^.]+$/, "") || "video";
      const link = document.createElement("a");
      link.href = href;
      link.download = `${base}_sophisticate${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const file = fileRef.current;
    if (!file) return;
    const href = fileUrl || URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName || "video";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (!fileUrl) URL.revokeObjectURL(href);
  }, [fileName, fileUrl, format, resultBlob]);

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

  useEffect(() => {
    return () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPreviewPlaying) return;
    if (trimEnd <= trimStart) return;
    if (currentTime < trimEnd) return;

    const previewVideo = getPreviewVideo();
    if (!previewVideo) return;

    previewVideo.pause();
    previewVideo.currentTime = trimEnd;
    setCurrentTime(trimEnd);
  }, [currentTime, getPreviewVideo, isPreviewPlaying, trimEnd, trimStart]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fileBadge = fileName
    ? `${prettyBytes(fileMeta.size)}${fileMeta.type ? ` — ${fileMeta.type}` : ""}`
    : "No file selected";

  const cropPx = videoDims.w > 0 ? cropPixels(crop, videoDims.w, videoDims.h) : null;
  const cropLabel = cropPx ? `${cropPx.w}×${cropPx.h} from ${videoDims.w}×${videoDims.h}` : "Load a video first";

  const fmtTime = useCallback((seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const m = Math.floor(s / 60);
    const rest = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${rest}`;
  }, []);

  return {
    inputRef,
    videoRef,
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
    loopCount,
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
    setLoopCount,
    setFps,
    setQuality,
    setIncludeAudio,
    applyPreset,
    fmtTime,
  };
}

export type SophisticateController = ReturnType<typeof useSophisticateController>;
