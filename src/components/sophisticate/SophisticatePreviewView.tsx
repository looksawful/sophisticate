"use client";

import { prettyBytes } from "@/lib/videoUtils";
import { MediaCommunitySkin, MediaOutlet, MediaPlayer } from "@vidstack/react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Scissors, Square, Upload } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import {
  ASPECT_PRESETS,
  containerVariants,
  fadeVariants,
  hoverLift,
  licenseUrl,
  repoUrl,
  riseVariants,
} from "./config";
import { Tooltip } from "./Tooltip";
import { TrimTimeline } from "./TrimTimeline";
import type { SophisticateController } from "./useSophisticateController";

export function SophisticatePreviewView({ c }: { c: SophisticateController }) {
  return (
    <motion.div
      className="relative min-h-screen bg-black/55 text-neutral-100 font-sans"
      onPaste={c.handlePaste}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <motion.div variants={fadeVariants} className="flex items-center justify-end gap-4 mb-3">
          <div className="text-xs sm:text-sm text-neutral-500">
            {c.processing ? `Processing ${Math.round(c.progress * 100)}%` : c.fileBadge}
          </div>
        </motion.div>

        {c.processing && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="mb-4 h-1.5 rounded-full bg-neutral-800 overflow-hidden origin-left"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(c.progress * 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.div>
        )}

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-12">
          <motion.section
            variants={riseVariants}
            className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {c.resultUrl && (
                  <div className="flex rounded-lg overflow-hidden border border-neutral-700">
                    <button
                      onClick={() => c.setShowResult(false)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        !c.showResult ? "bg-pink-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Source
                    </button>
                    <button
                      onClick={() => c.setShowResult(true)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        c.showResult ? "bg-pink-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Result
                    </button>
                  </div>
                )}
                <div className="text-sm text-neutral-500">{c.cropLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.resultBlob && !c.processing && <span className="text-sm text-neutral-500">{prettyBytes(c.resultBlob.size)}</span>}
                <Tooltip text="Pick a different video file (Ctrl+O)">
                  <button
                    onClick={() => c.inputRef.current?.click()}
                    disabled={c.processing}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 transition disabled:opacity-40"
                  >
                    Choose file
                  </button>
                </Tooltip>
                <Tooltip text="Clear everything (Esc)">
                  <button
                    onClick={c.clearAll}
                    disabled={c.processing}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-800 bg-neutral-950/40 hover:border-pink-500 transition disabled:opacity-40"
                  >
                    Clear
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="relative bg-neutral-950/40">
              <div className="h-[52vh] min-h-[320px] max-h-[640px] px-4 sm:px-5 py-4">
                <div
                  className="relative w-full h-full rounded-2xl border border-neutral-800 bg-black/60 overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={c.handleDrop}
                >
                  <AnimatePresence mode="wait">
                    {c.showResult && c.resultUrl ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0"
                      >
                        <MediaPlayer
                          className="w-full h-full"
                          src={c.resultUrl}
                          streamType="on-demand"
                          viewType="video"
                          title={c.fileName || "Result preview"}
                          crossorigin
                          playsInline
                        >
                          <MediaOutlet />
                          <MediaCommunitySkin />
                        </MediaPlayer>
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-green-600/90 text-xs font-semibold text-white">
                          Result — {c.resultBlob ? prettyBytes(c.resultBlob.size) : ""}
                        </div>
                      </motion.div>
                    ) : c.fileUrl ? (
                      <motion.div
                        key="source"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0"
                      >
                        <Cropper
                          video={c.fileUrl}
                          crop={c.uiCrop}
                          zoom={c.zoom}
                          aspect={c.cropAspect}
                          showGrid
                          objectFit="contain"
                          onCropChange={c.setUiCrop}
                          onCropComplete={c.onCropComplete}
                          onZoomChange={c.setZoom}
                        />
                        <video
                          ref={c.videoRef}
                          src={c.fileUrl}
                          className="hidden"
                          preload="metadata"
                          muted
                          playsInline
                          onLoadedMetadata={c.handleVideoMetadata}
                        />
                        {c.cropPx && (
                          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 border border-neutral-700 text-[10px] text-neutral-300 whitespace-nowrap">
                            {c.cropPx.w}×{c.cropPx.h}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0"
                      >
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                          <motion.div
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-2xl border-2 border-dashed border-neutral-600 flex items-center justify-center"
                          >
                            <span className="text-2xl text-neutral-500">▶</span>
                          </motion.div>
                          <div className="text-base text-neutral-300">Drop a video file here</div>
                          <div className="text-sm text-neutral-500">or choose / paste</div>
                          <label className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold bg-pink-600 hover:bg-pink-500 transition cursor-pointer">
                            <Upload size={16} className="mr-2" />
                            Choose file
                            <input
                              ref={c.inputRef}
                              type="file"
                              accept="video/*"
                              onChange={c.handlePick}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Tooltip
                    text={
                      c.canConvert
                        ? "Crop, compress, and encode your video (Enter)"
                        : c.processing
                          ? "Processing in progress..."
                          : "Load a video file first"
                    }
                  >
                    <motion.button
                      {...hoverLift}
                      onClick={c.realProcess}
                      disabled={!c.canConvert}
                      className={`w-full rounded-2xl px-6 py-4 text-lg font-semibold transition ${
                        c.canConvert
                          ? "bg-pink-600 hover:bg-pink-500 shadow-[0_0_20px_rgba(219,39,119,0.3)]"
                          : c.processing
                            ? "bg-pink-600/60 cursor-wait"
                            : "bg-neutral-800 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <Scissors size={18} className="mr-2 inline-block align-[-3px]" />
                      {c.processing ? `Processing ${Math.round(c.progress * 100)}%` : "Convert"}
                    </motion.button>
                  </Tooltip>

                  {c.processing ? (
                    <Tooltip text="Stop current processing">
                      <motion.button
                        {...hoverLift}
                        onClick={c.stopCurrentProcess}
                        className="w-full rounded-2xl px-6 py-4 text-lg font-semibold border border-red-500 bg-red-600/80 text-white transition hover:bg-red-500"
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
                            ? "border-green-500 bg-green-600 hover:bg-green-500 text-white shadow-[0_0_24px_rgba(34,197,94,0.35)] animate-pulse-once"
                            : "border-neutral-800 bg-neutral-950/30 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <Download size={18} className="mr-2 inline-block align-[-3px]" />
                        {c.resultBlob ? `Download (${prettyBytes(c.resultBlob.size)})` : "Download"}
                      </motion.button>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-4">
                <TrimTimeline
                  duration={c.videoDuration}
                  currentTime={c.currentTime}
                  trimStart={c.trimStart}
                  trimEnd={c.trimEnd}
                  processing={c.processing}
                  onSeek={c.seekPreview}
                  onTrimChange={c.setTrimRange}
                  onJumpToTrimStart={() => c.seekPreview(c.trimStart)}
                  playing={c.isPreviewPlaying}
                  onTogglePlay={c.togglePreviewPlayback}
                  formatTime={c.fmtTime}
                />
              </div>
            </div>
          </motion.section>

          <motion.aside
            variants={riseVariants}
            className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl"
          >
            <div className="p-4 sm:p-5 grid gap-3">
              <div className="grid gap-1.5">
                <div className="text-xs font-medium text-neutral-400">Aspect ratio</div>
                <div className="flex flex-wrap gap-1.5">
                  {ASPECT_PRESETS.map((preset) => (
                    <Tooltip key={preset.label} text={preset.desc} position="bottom">
                      <button
                        onClick={() => c.applyPreset(preset)}
                        disabled={!c.fileUrl || c.processing}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          c.activePreset === preset.label
                            ? "border-pink-500 bg-pink-500/10 text-pink-400"
                            : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                        } disabled:opacity-40`}
                      >
                        {preset.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-neutral-400">Zoom</div>
                  <div className="text-[10px] text-neutral-500 font-mono">{c.zoom.toFixed(2)}x</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={c.zoom}
                  onChange={(e) => c.setZoom(parseFloat(e.target.value))}
                  disabled={!c.fileUrl || c.processing}
                  className="w-full accent-pink-500"
                />
              </div>

              <div className="grid gap-1.5">
                <button
                  onClick={() => c.setShowCirclePreview((v) => !v)}
                  className={`flex items-center gap-2 text-xs font-medium transition ${
                    c.showCirclePreview ? "text-pink-400" : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full border-2 transition ${
                      c.showCirclePreview ? "border-pink-500 bg-pink-500" : "border-neutral-600"
                    }`}
                  />
                  Circle preview
                </button>
                {c.showCirclePreview && c.fileUrl && (
                  <div className="flex justify-center">
                    <canvas
                      ref={c.circleCanvasRef}
                      width={120}
                      height={120}
                      className="rounded-full border-2 border-neutral-700"
                      style={{ width: 96, height: 96 }}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-3">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip text="Target output file size" position="bottom">
                      <div className="grid gap-1">
                        <div className="text-xs font-medium text-neutral-400">Max size (MB)</div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={c.maxSize}
                          onChange={(e) => c.setMaxSize(e.target.value)}
                          disabled={c.processing}
                          className="w-full bg-black/25 border border-neutral-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-500 transition-colors"
                        />
                      </div>
                    </Tooltip>
                    <div className="grid gap-1">
                      <div className="text-xs font-medium text-neutral-400">Format</div>
                      <div className="grid grid-cols-2 gap-1">
                        {(["MP4", "WEBM"] as const).map((format) => (
                          <button
                            key={format}
                            onClick={() => c.setFormat(format)}
                            disabled={c.processing}
                            className={`rounded-lg px-2 py-2 text-xs font-semibold border transition ${
                              c.format === format
                                ? "border-pink-500 bg-pink-500/10 text-pink-400"
                                : "border-neutral-800 bg-neutral-900 hover:border-neutral-600 text-neutral-400"
                            }`}
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="text-xs font-medium text-neutral-400">Crop region</div>
                    {c.cropPx && (
                      <div className="text-[11px] text-neutral-400">
                        {c.cropPx.w}×{c.cropPx.h}px at ({c.cropPx.x}, {c.cropPx.y})
                      </div>
                    )}
                    <button
                      onClick={() => {
                        c.setCrop({ x: 0, y: 0, w: 1, h: 1 });
                        c.setActivePreset("Free");
                        c.setZoom(1);
                        c.setUiCrop({ x: 0, y: 0 });
                      }}
                      disabled={!c.fileUrl || c.processing}
                      className="w-full rounded-lg px-3 py-1.5 text-xs font-medium border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition disabled:opacity-40"
                    >
                      Reset crop
                    </button>
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border border-neutral-800 bg-neutral-950/30">
                <summary className="px-3 py-2 cursor-pointer select-none text-xs font-medium text-neutral-400 hover:text-neutral-200 transition">
                  Advanced settings
                </summary>
                <div className="px-3 pb-3 grid gap-3 border-t border-neutral-800 pt-3">
                  <div className="grid gap-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-neutral-400">Speed</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{c.speed}×</div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[0.25, 0.5, 1, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => c.setSpeed(s)}
                          disabled={c.processing}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.speed === s
                              ? "border-pink-500 bg-pink-500/10 text-pink-400"
                              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-neutral-400">Loop</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{c.loopCount}×</div>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => c.setLoopCount(n)}
                          disabled={c.processing}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.loopCount === n
                              ? "border-pink-500 bg-pink-500/10 text-pink-400"
                              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {n}×
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-neutral-400">Quality</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => c.setQuality(q)}
                          disabled={c.processing}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition capitalize ${
                            c.quality === q
                              ? "border-pink-500 bg-pink-500/10 text-pink-400"
                              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-neutral-600">
                      {c.quality === "low"
                        ? "Fast encode, larger file"
                        : c.quality === "high"
                          ? "Slow encode, best quality"
                          : "Balanced"}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-neutral-400">FPS</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[0, 15, 24, 30, 60].map((f) => (
                        <button
                          key={f}
                          onClick={() => c.setFps(f)}
                          disabled={c.processing}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                            c.fps === f
                              ? "border-pink-500 bg-pink-500/10 text-pink-400"
                              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {f === 0 ? "Auto" : f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </motion.aside>
        </div>

        <details className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="px-4 py-2.5 cursor-pointer select-none flex items-center justify-between text-xs text-neutral-500 hover:text-neutral-300 transition">
            <span>Log</span>
            <span className="text-[10px] text-neutral-600">{c.logs.length} lines</span>
          </summary>
          <div className="p-3 border-t border-neutral-800">
            <div className="bg-black border border-neutral-800 rounded-xl p-2.5 text-[10px] sm:text-[11px] font-mono leading-relaxed max-h-52 overflow-auto">
              {c.logs.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("[error]")
                      ? "text-red-400"
                      : line.startsWith("[done]") || line.startsWith("[complete]")
                        ? "text-green-400"
                        : "text-neutral-400"
                  }
                >
                  {line}
                </div>
              ))}
              <div ref={c.logsEndRef} />
            </div>
          </div>
        </details>

        <motion.footer
          variants={fadeVariants}
          className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[10px] text-neutral-600"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-500">Ctrl+V</kbd> paste
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-500">Ctrl+O</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-500">Enter</kbd> run
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-500">Esc</kbd> clear
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="tracking-[0.15em] uppercase">Sophisticate — browser-native video tools — 2026 looksawful</span>
            <span className="text-neutral-700">|</span>
            <a className="hover:text-neutral-200 transition" href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span className="text-neutral-700">|</span>
            <a className="hover:text-neutral-200 transition" href={licenseUrl} target="_blank" rel="noreferrer">
              MIT License
            </a>
          </div>
        </motion.footer>
      </div>
    </motion.div>
  );
}
