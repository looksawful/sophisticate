"use client";

import { prettyBytes } from "@/lib/videoUtils";
import { MediaCommunitySkin, MediaOutlet, MediaPlayer } from "@vidstack/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Circle, Download, Pause, Play, Square, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useDropzone } from "react-dropzone";

import { Button, getButtonClass } from "./controls";
import { hoverLift, riseVariants } from "./config";
import { Tooltip } from "./Tooltip";
import { ui } from "./ui";
import type { SophisticateController } from "./useSophisticateController";

export function PreviewPane({ c }: { c: SophisticateController }) {
  const prefersReducedMotion = useReducedMotion();
  const cropShellRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<"start" | "end" | "playhead" | null>(null);
  const [circleFrame, setCircleFrame] = useState<{ left: number; top: number; size: number } | null>(null);

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    noClick: true,
    onDropAccepted: c.handleDropFiles,
  });

  const dropHint = useMemo(() => {
    if (isDragReject) return "Unsupported file. Drop a video file.";
    if (isDragActive) return "Release to upload video";
    return "Drag and drop video here";
  }, [isDragActive, isDragReject]);

  const timelineMax = Math.max(c.videoDuration, 0.1);
  const trimStartPercent = (Math.max(0, Math.min(c.trimStart, timelineMax)) / timelineMax) * 100;
  const trimEndPercent = (Math.max(0, Math.min(c.trimEnd, timelineMax)) / timelineMax) * 100;
  const playheadPercent = (Math.max(0, Math.min(c.currentTime, timelineMax)) / timelineMax) * 100;
  const playedTrimStartPercent = trimStartPercent;
  const playedTrimEndPercent = Math.max(trimStartPercent, Math.min(playheadPercent, trimEndPercent));

  const clientXToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const safeWidth = Math.max(1, rect.width);
    const x = Math.max(0, Math.min(clientX - rect.left, safeWidth));
    const ratio = x / safeWidth;
    return ratio * timelineMax;
  };

  const applyDragValue = (mode: "start" | "end" | "playhead", clientX: number) => {
    const nextTime = clientXToTime(clientX);
    if (mode === "start") {
      c.setTrimRange(nextTime, c.trimEnd);
      return;
    }
    if (mode === "end") {
      c.setTrimRange(c.trimStart, nextTime);
      return;
    }
    c.seekPreview(nextTime);
  };

  const beginTimelineDrag = (mode: "start" | "end" | "playhead", clientX: number) => {
    dragModeRef.current = mode;
    applyDragValue(mode, clientX);

    const onMove = (ev: PointerEvent) => {
      const currentMode = dragModeRef.current;
      if (!currentMode) return;
      applyDragValue(currentMode, ev.clientX);
    };
    const onUp = () => {
      dragModeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (c.processing) return;
    const clickedTime = clientXToTime(e.clientX);
    const dStart = Math.abs(clickedTime - c.trimStart);
    const dEnd = Math.abs(clickedTime - c.trimEnd);
    beginTimelineDrag(dStart <= dEnd ? "start" : "end", e.clientX);
  };

  const handleStartHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (c.processing) return;
    e.preventDefault();
    e.stopPropagation();
    beginTimelineDrag("start", e.clientX);
  };

  const handleEndHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (c.processing) return;
    e.preventDefault();
    e.stopPropagation();
    beginTimelineDrag("end", e.clientX);
  };

  const handlePlayheadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (c.processing) return;
    e.preventDefault();
    e.stopPropagation();
    beginTimelineDrag("playhead", e.clientX);
  };

  useEffect(() => {
    if (!c.showCirclePreview || !c.fileUrl) {
      setCircleFrame(null);
      return;
    }

    const root = cropShellRef.current;
    if (!root) return;

    const updateCircleFrame = () => {
      const cropArea = root.querySelector(".reactEasyCrop_CropArea") as HTMLElement | null;
      if (!cropArea) {
        setCircleFrame(null);
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const areaRect = cropArea.getBoundingClientRect();
      const size = Math.min(areaRect.width, areaRect.height);
      const left = areaRect.left - rootRect.left + (areaRect.width - size) / 2;
      const top = areaRect.top - rootRect.top + (areaRect.height - size) / 2;

      setCircleFrame({ left, top, size });
    };

    updateCircleFrame();
    const observer = new ResizeObserver(updateCircleFrame);
    observer.observe(root);
    window.addEventListener("resize", updateCircleFrame);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCircleFrame);
    };
  }, [c.fileUrl, c.showCirclePreview, c.cropAspect, c.zoom]);

  return (
    <motion.section variants={riseVariants} className={`lg:col-span-8 ${ui.panelStrong} shadow-xl overflow-hidden`}>
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {c.resultUrl && (
            <div className="flex rounded-lg overflow-hidden border border-zinc-700">
              <button
                onClick={() => c.setShowResult(false)}
                className={getButtonClass(!c.showResult ? "chipActive" : "chip", "md", "rounded-none border-none font-medium")}
              >
                Source
              </button>
              <button
                onClick={() => c.setShowResult(true)}
                className={getButtonClass(c.showResult ? "chipActive" : "chip", "md", "rounded-none border-none font-medium")}
              >
                Result
              </button>
            </div>
          )}
          <div className={ui.muted}>{c.cropLabel}</div>
        </div>
        {c.resultBlob && !c.processing && <span className={ui.muted}>{prettyBytes(c.resultBlob.size)}</span>}
      </div>

      <div className="relative bg-zinc-950/55">
        <div className="h-[72vh] min-h-[500px] max-h-[860px] px-5 sm:px-6 pt-5 pb-4">
          <div
            {...getRootProps()}
            ref={cropShellRef}
            className={`relative w-full h-full rounded-2xl border bg-black/68 overflow-hidden transition-colors backdrop-blur-sm ${
              isDragActive
                ? isDragReject
                  ? "border-red-500/70 ring-2 ring-red-500/20"
                  : "border-pink-500/70 ring-2 ring-pink-500/25"
                : "border-zinc-800"
            }`}
          >
            <input {...getInputProps()} />
            <AnimatePresence mode="wait">
              {c.showResult && c.resultUrl ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <div className="result-player-shell h-full w-full">
                    <MediaPlayer
                      className="h-full w-full"
                      src={c.resultUrl}
                      streamType="on-demand"
                      viewType="video"
                      title={c.fileName || "Result preview"}
                      crossorigin="anonymous"
                      playsinline
                    >
                      <MediaOutlet />
                      <MediaCommunitySkin />
                    </MediaPlayer>
                  </div>
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <Tooltip text="Choose another file (Ctrl+O)" position="bottom">
                      <Button onClick={() => c.inputRef.current?.click()} disabled={c.processing} className="font-medium backdrop-blur-sm bg-black/45 border-zinc-600 text-sm px-3.5 py-2">
                        Replace file
                      </Button>
                    </Tooltip>
                    <Tooltip text="Remove the loaded file (Esc)" position="bottom">
                      <Button onClick={c.clearAll} disabled={c.processing} className="font-medium backdrop-blur-sm bg-black/45 border-zinc-600 text-sm px-3.5 py-2">
                        Clear file
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-green-700/85 text-xs font-semibold text-white">
                    Result - {c.resultBlob ? prettyBytes(c.resultBlob.size) : ""}
                  </div>
                </motion.div>
              ) : c.fileUrl ? (
                <motion.div
                  key="source"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <Cropper
                    video={c.fileUrl}
                    crop={c.uiCrop}
                    zoom={c.zoom}
                    aspect={c.cropAspect}
                    zoomSpeed={Math.max(0.02, c.zoomStep * 6)}
                    showGrid
                    objectFit="contain"
                    onCropChange={c.setUiCrop}
                    onCropComplete={c.onCropComplete}
                    onZoomChange={c.setZoom}
                    setVideoRef={c.setPreviewVideoRef}
                    mediaProps={{
                      muted: true,
                      playsInline: true,
                      loop: false,
                      preload: "auto",
                      onTimeUpdate: (e) => c.handlePreviewTimeUpdate((e.currentTarget as HTMLVideoElement).currentTime || 0),
                      onPlay: () => c.handlePreviewPlay(),
                      onPause: () => c.handlePreviewPause(),
                    }}
                  />
                  <video
                    ref={c.videoRef}
                    src={c.fileUrl}
                    className="hidden"
                    preload="auto"
                    muted
                    playsInline
                    onLoadedMetadata={c.handleVideoMetadata}
                  />
                  {c.cropPx && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 border border-zinc-700 text-xs text-zinc-200 whitespace-nowrap">
                      {c.cropPx.w}x{c.cropPx.h}
                    </div>
                  )}
                  {c.showCirclePreview && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      {circleFrame && (
                        <div
                          className="absolute rounded-full border-2 border-pink-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]"
                          style={{
                            left: `${circleFrame.left}px`,
                            top: `${circleFrame.top}px`,
                            width: `${circleFrame.size}px`,
                            height: `${circleFrame.size}px`,
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-xl text-zinc-100 backdrop-blur-sm">
                    {c.fmtTime(c.currentTime)} / {c.fmtTime(c.videoDuration)}
                  </div>
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <Tooltip text="Choose another file (Ctrl+O)" position="top">
                      <Button onClick={() => c.inputRef.current?.click()} disabled={c.processing} className="font-medium backdrop-blur-sm bg-black/45 border-zinc-600">
                        Replace file
                      </Button>
                    </Tooltip>
                    <Tooltip text="Remove the loaded file (Esc)" position="top">
                      <Button onClick={c.clearAll} disabled={c.processing} className="font-medium backdrop-blur-sm bg-black/45 border-zinc-600">
                        Clear file
                      </Button>
                    </Tooltip>
                  </div>
                  <button
                    type="button"
                    onClick={() => c.setShowCirclePreview((v) => !v)}
                    className={`absolute top-3 right-3 z-20 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 ${
                      c.showCirclePreview ? "text-pink-300" : "text-zinc-300 hover:text-zinc-100"
                    }`}
                    aria-pressed={c.showCirclePreview}
                  >
                    {c.showCirclePreview ? <Circle size={14} /> : <Square size={14} />}
                    <span>Preview mode: {c.showCirclePreview ? "Circle" : "Default"}</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0"
                >
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                    <div className="text-lg text-zinc-50">{dropHint}</div>
                    <div className="text-sm text-zinc-300">or choose file / paste</div>
                    <Button type="button" onClick={open} variant="primary" size="md" className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold">
                      <Upload size={16} className="mr-2" />
                      Choose file
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {c.fileUrl && !c.showResult && c.videoDuration > 0 && (
          <div className="px-5 sm:px-6 pb-5">
            <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/80 backdrop-blur-xl shadow-lg p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  type="button"
                  onClick={c.togglePreviewPlayback}
                  disabled={c.processing}
                  className="h-14 sm:h-16 min-w-[84px] sm:min-w-[96px] px-3 text-base font-semibold flex items-center justify-center"
                  aria-label={c.isPreviewPlaying ? "Pause preview" : "Play preview"}
                >
                  {c.isPreviewPlaying ? <Pause size={30} /> : <Play size={30} />}
                </Button>

                <div className="min-w-0 flex-1 flex items-center">
                  <div
                    ref={timelineRef}
                    className="relative h-14 sm:h-16 w-full rounded-xl border border-zinc-700/70 bg-black/30 px-3"
                    onPointerDown={handleTimelinePointerDown}
                  >
                    <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-800/80" />
                    <div className="pointer-events-none absolute inset-y-0 left-3 right-3">
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-md border border-zinc-600/80 bg-transparent"
                        style={{ left: "0%", width: `${trimStartPercent}%` }}
                      />
                      <div
                        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200/60"
                        style={{ left: `${trimStartPercent}%`, width: `${Math.max(0, trimEndPercent - trimStartPercent)}%` }}
                      />
                      <div
                        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-fuchsia-500/85 shadow-[0_0_8px_rgba(217,70,239,0.45)]"
                        style={{
                          left: `${playedTrimStartPercent}%`,
                          width: `${Math.max(0, playedTrimEndPercent - playedTrimStartPercent)}%`,
                        }}
                      />
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-md border border-zinc-600/80 bg-transparent"
                        style={{ left: `${trimEndPercent}%`, width: `${Math.max(0, 100 - trimEndPercent)}%` }}
                      />
                      <div
                        className="absolute top-1/2 z-40 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-100 bg-white shadow-[0_0_6px_rgba(255,255,255,0.45)] pointer-events-auto cursor-ew-resize"
                        style={{ left: `${playheadPercent}%` }}
                        onPointerDown={handlePlayheadDown}
                      />
                      <div
                        className="absolute top-1/2 z-30 h-11 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-zinc-500/90 pointer-events-auto cursor-ew-resize"
                        style={{ left: `${trimStartPercent}%` }}
                        onPointerDown={handleStartHandleDown}
                      />
                      <div
                        className="absolute top-1/2 z-30 h-11 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-zinc-500/90 pointer-events-auto cursor-ew-resize"
                        style={{ left: `${trimEndPercent}%` }}
                        onPointerDown={handleEndHandleDown}
                      />
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={timelineMax}
                      step={0.01}
                      value={Math.min(c.currentTime, timelineMax)}
                      onChange={(e) => c.seekPreview(parseFloat(e.target.value))}
                      className="absolute inset-0 z-10 w-full cursor-pointer appearance-none bg-transparent opacity-0 pointer-events-none [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:w-0"
                      aria-label="Preview position"
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 sm:px-6 pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Tooltip
              text={
                c.canConvert
                  ? "Crop, compress, and encode your video (Enter)"
                  : c.processing
                    ? "Processing in progress"
                    : "Load a video file first"
              }
            >
              <motion.button
                {...hoverLift}
                onClick={c.realProcess}
                disabled={!c.canConvert}
                className={`w-full text-lg font-semibold ${
                  c.canConvert
                    ? getButtonClass("primary", "lg")
                    : "rounded-2xl bg-zinc-800 px-6 py-4 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {c.processing ? `Processing ${Math.round(c.progress * 100)}%` : "Convert"}
              </motion.button>
            </Tooltip>

            {c.processing ? (
              <Tooltip text="Stop current processing">
                <motion.button
                  {...hoverLift}
                  onClick={c.stopCurrentProcess}
                  className={`w-full font-semibold ${getButtonClass("danger", "lg")}`}
                >
                  <Square size={18} className="mr-2 inline-block align-[-3px]" />
                  Stop
                </motion.button>
              </Tooltip>
            ) : (
              <Tooltip text={c.resultBlob ? "Save the processed video to disk" : "Process a video first to download"}>
                <motion.button
                  {...hoverLift}
                  onClick={c.handleDownload}
                  disabled={!c.resultBlob}
                  className={`w-full rounded-2xl px-6 py-4 text-lg font-semibold border transition ${
                    c.resultBlob
                      ? "border-green-500 bg-green-600 hover:bg-green-500 text-white shadow-[0_0_24px_rgba(34,197,94,0.35)]"
                      : "border-zinc-800 bg-zinc-950/30 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  <Download size={18} className="mr-2 inline-block align-[-3px]" />
                  {c.resultBlob ? `Download (${prettyBytes(c.resultBlob.size)})` : "Download"}
                </motion.button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
