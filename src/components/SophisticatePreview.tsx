"use client";

import { cropPixels, normalizeCrop, prettyBytes } from "@/lib/videoUtils";
import type { Crop } from "@/lib/videoUtils";
import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const repoUrl = "https://github.com/looksawful/sophisticate";
const licenseUrl = `${repoUrl}/blob/main/LICENSE`;
const easeStandard = cubicBezier(0.22, 1, 0.36, 1);
const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const hoverLift = { whileHover: { y: -1 }, whileTap: { scale: 0.98 } };
const riseVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeStandard } },
};
const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6, ease: easeStandard } },
};

function Tooltip({ text, children, position = "top" }: { text: string; children: React.ReactNode; position?: "top" | "bottom" }) {
  return (
    <div className="relative group">
      {children}
      <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 ${
        position === "top" ? "bottom-full mb-2" : "top-full mt-2"
      }`}>{text}</div>
    </div>
  );
}

export default function SophisticatePreview() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resultVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState({ size: 0, type: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [url, setUrl] = useState("");
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  const [maxSize, setMaxSize] = useState("0.49");
  const [format, setFormat] = useState<"MP4" | "WEBM">("MP4");

  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [lockSquare, setLockSquare] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const dragStartRef = useRef<{
    mode: "move" | "se" | "e" | "s";
    clientX: number;
    clientY: number;
    crop: Crop;
  } | null>(null);

  const fileUrlRef = useRef("");
  const fileRef = useRef<File | null>(null);
  const [logs, setLogs] = useState<string[]>(["Ready"]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const resultUrlRef = useRef("");

  const canConvert = !!fileName && !processing;

  const addLog = useCallback((line: string) => {
    setLogs((prev) => {
      const next = prev.length > 900 ? prev.slice(prev.length - 650) : prev;
      return [...next, line];
    });
  }, []);

  const setFile = useCallback(
    (f: File) => {
      setFileName(f.name);
      setFileMeta({ size: f.size, type: f.type || "" });
      addLog(`[input] file: ${f.name} (${prettyBytes(f.size)})`);
      fileRef.current = f;

      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      const u = URL.createObjectURL(f);
      fileUrlRef.current = u;
      setFileUrl(u);

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
      setResultUrl("");
      setResultBlob(null);
      setShowResult(false);

      setLockSquare(false);
      setCrop({ x: 0, y: 0, w: 1, h: 1 });

      setTimeout(() => {
        const v = videoRef.current;
        if (v) {
          try {
            v.currentTime = 0;
            v.play?.().catch(() => undefined);
          } catch {}
        }
      }, 50);
    },
    [addLog],
  );

  const clearAll = useCallback(() => {
    setFileName("");
    setFileMeta({ size: 0, type: "" });
    setProgress(0);
    setLogs(["Ready"]);
    setUrl("");
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setVideoDims({ w: 0, h: 0 });
    setShowResult(false);
    fileRef.current = null;

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = "";
    setResultUrl("");
    setResultBlob(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) {
          setFile(f);
          addLog("[input] pasted file from clipboard");
          break;
        }
      }
    }
  }

  const fetchFromUrl = useCallback(async () => {
    const u = url.trim();
    if (!u) return;

    addLog(`[input] fetching: ${u}`);
    setProcessing(true);
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const nameFromUrl = (() => {
        try {
          const p = new URL(u);
          const last = p.pathname.split("/").filter(Boolean).pop();
          return last || "remote_video";
        } catch {
          return "remote_video";
        }
      })();

      const file = new File([blob], nameFromUrl, { type: blob.type || "video/mp4" });
      setFile(file);
      addLog(`[input] fetched ok (${prettyBytes(file.size)})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[error] fetch failed: ${message}`);
    } finally {
      setProcessing(false);
    }
  }, [addLog, setFile, url]);

  const handleVideoMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setVideoDims({ w: v.videoWidth, h: v.videoHeight });
      addLog(`[meta] ${v.videoWidth}x${v.videoHeight}, ${v.duration.toFixed(1)}s`);
    }
  }, [addLog]);

  const updateCropField = useCallback((field: keyof Crop, value: number) => {
    setCrop(prev => {
      const next = { ...prev, [field]: value };
      if (lockSquare && (field === "w" || field === "h")) {
        next.w = value;
        next.h = value;
      }
      return normalizeCrop(next);
    });
  }, [lockSquare]);

  const realProcess = useCallback(async () => {
    if (!fileName || !fileRef.current) return;

    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      addLog("[error] video metadata not loaded — play the video first");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setShowResult(false);

    const px = cropPixels(crop, v.videoWidth, v.videoHeight);
    setLogs([
      "[run] start",
      `[run] max size=${maxSize} MB, format=${format}`,
      `[run] crop ${px.w}x${px.h}+${px.x}+${px.y} from ${v.videoWidth}x${v.videoHeight}`,
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
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        duration: v.duration || 1,
        onLog: addLog,
        onProgress: setProgress,
      });

      setResultBlob(blob);
      const u = URL.createObjectURL(blob);
      resultUrlRef.current = u;
      setResultUrl(u);
      setShowResult(true);
      addLog(`[complete] ${prettyBytes(blob.size)} — ready to download`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[error] ${msg}`);
    } finally {
      setProcessing(false);
    }
  }, [addLog, crop, fileName, format, maxSize]);

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

  function startDrag(e: React.PointerEvent, mode: "move" | "se" | "e" | "s") {
    e.preventDefault();
    e.stopPropagation();

    dragStartRef.current = {
      mode,
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...crop },
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;

    const s = dragStartRef.current;
    const box = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - s.clientX) / box.width;
    const dy = (e.clientY - s.clientY) / box.height;

    let next = { ...s.crop };

    if (s.mode === "move") {
      next.x = s.crop.x + dx;
      next.y = s.crop.y + dy;
      next = normalizeCrop(next);
      setCrop(next);
      return;
    }

    if (s.mode === "se") {
      next.w = s.crop.w + dx;
      next.h = s.crop.h + dy;
      if (lockSquare) {
        const m = Math.max(next.w, next.h);
        next.w = m;
        next.h = m;
      }
      next = normalizeCrop(next);
      setCrop(next);
      return;
    }

    if (s.mode === "e") {
      next.w = s.crop.w + dx;
      if (lockSquare) next.h = next.w;
      next = normalizeCrop(next);
      setCrop(next);
      return;
    }

    if (s.mode === "s") {
      next.h = s.crop.h + dy;
      if (lockSquare) next.w = next.h;
      next = normalizeCrop(next);
      setCrop(next);
      return;
    }
  }

  function endDrag() {
    dragStartRef.current = null;
  }

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

  const fileBadge = fileName ? `${prettyBytes(fileMeta.size)}${fileMeta.type ? ` — ${fileMeta.type}` : ""}` : "No file selected";

  const cropPx = videoDims.w > 0 ? cropPixels(crop, videoDims.w, videoDims.h) : null;
  const cropLabel = cropPx
    ? `${cropPx.w}×${cropPx.h} from ${videoDims.w}×${videoDims.h}`
    : "Load a video first";

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      className="min-h-screen bg-black text-neutral-100 font-sans"
      onPaste={handlePaste}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <motion.div variants={fadeVariants} className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-neutral-100">Sophisticate</span>
            <span className="text-xs text-neutral-600">video crop & compress</span>
          </div>
          <div className="text-xs sm:text-sm text-neutral-500">
            {processing ? `Processing ${Math.round(progress * 100)}%` : fileBadge}
          </div>
        </motion.div>

        {processing && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="mb-4 h-1.5 rounded-full bg-neutral-800 overflow-hidden origin-left"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
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
                {resultUrl && (
                  <div className="flex rounded-lg overflow-hidden border border-neutral-700">
                    <button
                      onClick={() => setShowResult(false)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        !showResult ? "bg-pink-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Source
                    </button>
                    <button
                      onClick={() => setShowResult(true)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        showResult ? "bg-pink-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Result
                    </button>
                  </div>
                )}
                <div className="text-sm text-neutral-500">{cropLabel}</div>
              </div>
              <div className="text-sm text-neutral-500">
                {resultBlob && !processing ? prettyBytes(resultBlob.size) : ""}
              </div>
            </div>

            <div className="relative bg-neutral-950/40">
              <div className="h-[52vh] min-h-[320px] max-h-[640px] px-4 sm:px-5 py-4">
                <div
                  ref={videoContainerRef}
                  className="relative w-full h-full rounded-2xl border border-neutral-800 bg-black/60 overflow-hidden"
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                >
                  <AnimatePresence mode="wait">
                    {showResult && resultUrl ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0"
                      >
                        <video
                          ref={resultVideoRef}
                          src={resultUrl}
                          className="w-full h-full object-contain"
                          controls
                          playsInline
                          autoPlay
                          muted
                        />
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-green-600/90 text-xs font-semibold text-white">
                          Result — {resultBlob ? prettyBytes(resultBlob.size) : ""}
                        </div>
                      </motion.div>
                    ) : fileUrl ? (
                      <motion.div
                        key="source"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0"
                      >
                        <video
                          ref={videoRef}
                          src={fileUrl}
                          className="absolute inset-0 w-full h-full object-contain"
                          controls
                          playsInline
                          muted
                          onLoadedMetadata={handleVideoMetadata}
                        />

                        <div className="absolute inset-0 pointer-events-none" />

                        <div
                          className="absolute border-2 border-pink-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                          style={{
                            left: `${crop.x * 100}%`,
                            top: `${crop.y * 100}%`,
                            width: `${crop.w * 100}%`,
                            height: `${crop.h * 100}%`,
                          }}
                          onPointerDown={(e) => startDrag(e, "move")}
                        >
                          <div className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-black/80 border border-neutral-700 text-[10px] text-neutral-300 whitespace-nowrap">
                            {cropPx ? `${cropPx.w}×${cropPx.h}` : ""} — drag to move
                          </div>

                          <div
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-8 rounded bg-pink-500/90 cursor-ew-resize hover:bg-pink-400 transition-colors"
                            onPointerDown={(e) => startDrag(e, "e")}
                          />
                          <div
                            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-8 h-3 rounded bg-pink-500/90 cursor-ns-resize hover:bg-pink-400 transition-colors"
                            onPointerDown={(e) => startDrag(e, "s")}
                          />
                          <div
                            className="absolute -right-2 -bottom-2 w-4 h-4 rounded-md bg-pink-500 cursor-nwse-resize hover:bg-pink-400 transition-colors"
                            onPointerDown={(e) => startDrag(e, "se")}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
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
                          <div className="text-sm text-neutral-500">or choose / paste / enter URL</div>
                          <label className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold bg-pink-600 hover:bg-pink-500 transition cursor-pointer">
                            Choose file
                            <input ref={inputRef} type="file" accept="video/*" onChange={handlePick} className="hidden" />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Tooltip text={canConvert ? "Crop, compress, and encode your video (Enter)" : processing ? "Processing in progress..." : "Load a video file first"}>
                    <motion.button
                      {...hoverLift}
                      onClick={realProcess}
                      disabled={!canConvert}
                      className="w-full rounded-2xl px-6 py-4 text-lg font-semibold bg-pink-600 hover:bg-pink-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {processing ? `Processing ${Math.round(progress * 100)}%` : "Convert"}
                    </motion.button>
                  </Tooltip>

                  <Tooltip text={resultBlob ? "Save the processed video to disk" : "Process a video first to download"}>
                    <motion.button
                      {...hoverLift}
                      onClick={handleDownload}
                      disabled={!resultBlob}
                      className="w-full rounded-2xl px-6 py-4 text-lg font-semibold border border-neutral-800 bg-neutral-950/30 hover:border-pink-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resultBlob ? `Download (${prettyBytes(resultBlob.size)})` : "Download"}
                    </motion.button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.aside
            variants={riseVariants}
            className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl"
          >
            <div className="p-4 sm:p-5 grid gap-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                <div className="grid gap-3">
                  <Tooltip text="Target output file size — the encoder will try to hit this exactly" position="bottom">
                    <div className="grid gap-1.5">
                      <div className="text-xs font-medium text-neutral-400">Max size (MB)</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={maxSize}
                        onChange={(e) => setMaxSize(e.target.value)}
                        disabled={processing}
                        className="w-full bg-black/25 border border-neutral-800 rounded-xl px-4 py-2.5 text-base outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </Tooltip>

                  <div className="grid gap-1.5">
                    <div className="text-xs font-medium text-neutral-400">Format</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Tooltip text="H.264 codec — best compatibility">
                        <motion.button
                          {...hoverLift}
                          onClick={() => setFormat("MP4")}
                          disabled={processing}
                          className={`w-full rounded-xl px-4 py-2.5 text-base font-semibold border transition ${
                            format === "MP4" ? "border-pink-500 bg-pink-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                          }`}
                        >
                          MP4
                        </motion.button>
                      </Tooltip>
                      <Tooltip text="VP8 codec — smaller files, web-native">
                        <motion.button
                          {...hoverLift}
                          onClick={() => setFormat("WEBM")}
                          disabled={processing}
                          className={`w-full rounded-xl px-4 py-2.5 text-base font-semibold border transition ${
                            format === "WEBM" ? "border-pink-500 bg-pink-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                          }`}
                        >
                          WEBM
                        </motion.button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-neutral-400">Crop region</div>
                      <Tooltip text={lockSquare ? "Switch to free aspect ratio" : "Lock width = height"}>
                        <button
                          onClick={() => {
                            const next = !lockSquare;
                            setLockSquare(next);
                            if (next) {
                              const s = Math.min(crop.w, crop.h);
                              setCrop(normalizeCrop({ ...crop, w: s, h: s }));
                            }
                          }}
                          disabled={!fileUrl || processing}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            lockSquare ? "border-pink-500 bg-pink-500/10 text-pink-400" : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                          } disabled:opacity-40`}
                        >
                          {lockSquare ? "1:1 locked" : "Free"}
                        </button>
                      </Tooltip>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(["x", "y", "w", "h"] as const).map((field) => (
                        <Tooltip key={field} text={{
                          x: "Horizontal offset (0–1)",
                          y: "Vertical offset (0–1)",
                          w: "Width fraction (0–1)",
                          h: "Height fraction (0–1)",
                        }[field]} position="bottom">
                          <div>
                            <label className="text-[10px] uppercase text-neutral-500 mb-0.5 block">{field}</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={crop[field].toFixed(3)}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isFinite(v)) updateCropField(field, v);
                              }}
                              disabled={!fileUrl || processing}
                              className="w-full bg-black/25 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-pink-500 transition-colors disabled:opacity-40"
                            />
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                    {cropPx && (
                      <div className="text-[10px] text-neutral-600">
                        Output: {cropPx.w}×{cropPx.h}px at ({cropPx.x}, {cropPx.y})
                      </div>
                    )}
                    <Tooltip text="Reset crop to full frame">
                      <button
                        onClick={() => setCrop({ x: 0, y: 0, w: 1, h: 1 })}
                        disabled={!fileUrl || processing}
                        className="w-full rounded-lg px-3 py-1.5 text-xs font-medium border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition disabled:opacity-40"
                      >
                        Reset crop
                      </button>
                    </Tooltip>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 grid gap-2">
                    <Tooltip text="Pick a different video file (Ctrl+O)">
                      <motion.button
                        {...hoverLift}
                        onClick={() => inputRef.current?.click()}
                        disabled={processing}
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 transition disabled:opacity-40"
                      >
                        Choose file
                      </motion.button>
                    </Tooltip>

                    <Tooltip text="Clear everything and start over (Esc)">
                      <motion.button
                        {...hoverLift}
                        onClick={clearAll}
                        disabled={processing}
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold border border-neutral-800 bg-neutral-950/40 hover:border-pink-500 transition disabled:opacity-40"
                      >
                        Clear
                      </motion.button>
                    </Tooltip>
                  </div>

                  <div className="grid gap-2 pt-2 border-t border-neutral-800">
                    <div className="text-xs font-medium text-neutral-400">Fetch from URL</div>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="w-full bg-black/25 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-500 transition-colors"
                      disabled={processing}
                    />
                    <motion.button
                      {...hoverLift}
                      onClick={fetchFromUrl}
                      disabled={processing || !url.trim()}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-pink-600/15 border border-pink-500/25 hover:bg-pink-600/20 transition disabled:opacity-40"
                    >
                      Fetch
                    </motion.button>
                  </div>

                  <div className="text-[10px] text-neutral-600 flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">Ctrl+V</kbd> paste
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">Ctrl+O</kbd> open
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">Enter</kbd> run
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">Esc</kbd> clear
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30">
                <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between">
                  <div className="text-xs text-neutral-500">Log</div>
                  <div className="text-[10px] text-neutral-600">{logs.length} lines</div>
                </div>
                <div className="p-3">
                  <div className="bg-black border border-neutral-800 rounded-xl p-2.5 text-[10px] sm:text-[11px] font-mono leading-relaxed max-h-52 overflow-auto">
                    {logs.map((l, i) => (
                      <div key={i} className={l.startsWith("[error]") ? "text-red-400" : l.startsWith("[done]") || l.startsWith("[complete]") ? "text-green-400" : "text-neutral-400"}>{l}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>

        <motion.footer
          variants={fadeVariants}
          className="mt-6 sm:mt-8 flex flex-col items-start gap-2 text-xs text-neutral-500"
        >
          <div className="tracking-[0.15em] uppercase text-[10px] text-neutral-600">
            Sophisticate — browser-native video tools — 2026 looksawful
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
