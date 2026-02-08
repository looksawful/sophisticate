"use client";

import type { Crop } from "@/lib/videoUtils";
import { cropPixels, normalizeCrop, prettyBytes } from "@/lib/videoUtils";
import type { Area } from "react-easy-crop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ASPECT_PRESETS, type AspectPreset } from "./config";

export function useSophisticateController() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const circleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState({ size: 0, type: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  const [maxSize, setMaxSize] = useState("0.49");
  const [format, setFormat] = useState<"MP4" | "WEBM">("MP4");

  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [activePreset, setActivePreset] = useState<string>("1:1");
  const [showResult, setShowResult] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [uiCrop, setUiCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [showCirclePreview, setShowCirclePreview] = useState(false);

  const fileUrlRef = useRef("");
  const fileRef = useRef<File | null>(null);
  const [logs, setLogs] = useState<string[]>(["Ready"]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const resultUrlRef = useRef("");
  const cancelRequestedRef = useRef(false);

  const canConvert = !!fileName && !processing;

  const cropAspect = useMemo(() => {
    const preset = ASPECT_PRESETS.find((p) => p.label === activePreset);
    if (!preset || preset.w === 0 || preset.h === 0) return undefined;
    return preset.w / preset.h;
  }, [activePreset]);

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
      setZoom(1);
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
      setZoom(1);
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
    setCurrentTime(0);
    setIsPreviewPlaying(false);
    setUiCrop({ x: 0, y: 0 });
    setZoom(1);
    fileRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
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
    setVideoDuration(videoEl.duration || 0);
    setCurrentTime(0);
    setIsPreviewPlaying(false);
    setTrimEnd(videoEl.duration || 0);
    setTrimStart(0);
    addLog(`[meta] ${videoEl.videoWidth}x${videoEl.videoHeight}, ${videoEl.duration.toFixed(1)}s`);

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
      `[run] max size=${maxSize} MB, format=${format}`,
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
        trimEnd: trimEnd < (videoEl.duration || 0) ? trimEnd : undefined,
        speed: speed !== 1 ? speed : undefined,
        loop: loopCount > 1 ? loopCount : undefined,
        fps: fps > 0 ? fps : undefined,
        quality,
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
  }, [addLog, crop, fileName, format, fps, loopCount, maxSize, quality, speed, trimEnd, trimStart]);

  const stopCurrentProcess = useCallback(async () => {
    if (!processing) return;
    cancelRequestedRef.current = true;
    addLog("[run] stopping...");
    const { stopProcessing } = await import("@/lib/processVideo");
    stopProcessing();
  }, [addLog, processing]);

  const seekPreview = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, videoDuration || 0));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }, [videoDuration]);

  const togglePreviewPlayback = useCallback(async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    try {
      if (videoEl.paused) {
        if (videoEl.currentTime < trimStart || videoEl.currentTime > trimEnd) {
          videoEl.currentTime = trimStart;
          setCurrentTime(trimStart);
        }
        await videoEl.play();
      } else {
        videoEl.pause();
      }
    } catch {}
  }, [trimEnd, trimStart]);

  const setTrimRange = useCallback((start: number, end: number) => {
    const minGap = 0.1;
    const max = Math.max(0, videoDuration || 0);
    const safeStart = Math.max(0, Math.min(start, max));
    const safeEnd = Math.max(safeStart + minGap, Math.min(end, max));
    setTrimStart(safeStart);
    setTrimEnd(safeEnd);
  }, [videoDuration]);

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
      if (e.key === "Escape") {
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
    if (!showCirclePreview || !fileUrl) return;
    const videoEl = videoRef.current;
    const canvas = circleCanvasRef.current;
    if (!videoEl || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const size = 120;
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      const sx = crop.x * videoEl.videoWidth;
      const sy = crop.y * videoEl.videoHeight;
      const sw = crop.w * videoEl.videoWidth;
      const sh = crop.h * videoEl.videoHeight;
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, size, size);
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [crop, fileUrl, showCirclePreview]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onTime = () => {
      setCurrentTime(videoEl.currentTime || 0);
    };
    const onPlay = () => setIsPreviewPlaying(true);
    const onPause = () => setIsPreviewPlaying(false);
    const onEnded = () => setIsPreviewPlaying(false);

    videoEl.addEventListener("timeupdate", onTime);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("ended", onEnded);
    return () => {
      videoEl.removeEventListener("timeupdate", onTime);
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("ended", onEnded);
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!isPreviewPlaying) return;
    if (currentTime <= trimEnd) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.pause();
    seekPreview(trimStart);
  }, [currentTime, isPreviewPlaying, seekPreview, trimEnd, trimStart]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fileBadge = fileName
    ? `${prettyBytes(fileMeta.size)}${fileMeta.type ? ` — ${fileMeta.type}` : ""}`
    : "No file selected";

  const cropPx = videoDims.w > 0 ? cropPixels(crop, videoDims.w, videoDims.h) : null;
  const cropLabel = cropPx ? `${cropPx.w}×${cropPx.h} from ${videoDims.w}×${videoDims.h}` : "Load a video first";

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec.padStart(4, "0")}`;
  };

  return {
    inputRef,
    videoRef,
    circleCanvasRef,
    logsEndRef,
    fileUrl,
    fileName,
    maxSize,
    format,
    crop,
    activePreset,
    showResult,
    videoDuration,
    trimStart,
    trimEnd,
    currentTime,
    isPreviewPlaying,
    speed,
    loopCount,
    fps,
    quality,
    showCirclePreview,
    logs,
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
    cropAspect,
    setUiCrop,
    setZoom,
    setShowResult,
    clearAll,
    handleDrop,
    handlePick,
    handlePaste,
    handleVideoMetadata,
    onCropComplete,
    realProcess,
    stopCurrentProcess,
    handleDownload,
    seekPreview,
    setTrimRange,
    togglePreviewPlayback,
    setShowCirclePreview,
    setMaxSize,
    setFormat,
    setCrop,
    setActivePreset,
    setTrimStart,
    setTrimEnd,
    setSpeed,
    setLoopCount,
    setFps,
    setQuality,
    applyPreset,
    fmtTime,
  };
}

export type SophisticateController = ReturnType<typeof useSophisticateController>;
