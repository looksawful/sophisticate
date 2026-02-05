"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cubicBezier, motion } from "framer-motion";
import { normalizeCrop, prettyBytes } from "@/lib/videoUtils";

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

export default function SophisticatePreview() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState({ size: 0, type: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [url, setUrl] = useState("");

  const [maxSize, setMaxSize] = useState("0.49");
  const [format, setFormat] = useState<"MP4" | "WEBM">("MP4");

  const [crop, setCrop] = useState({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
  const [lockSquare, setLockSquare] = useState(true);
  const dragStartRef = useRef<{
    mode: "move" | "se" | "e" | "s";
    clientX: number;
    clientY: number;
    crop: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const fileUrlRef = useRef("");
  const [logs, setLogs] = useState<string[]>(["Ready"]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const canConvert = !!fileName && !processing;

  const addLog = useCallback((line: string) => {
    setLogs((prev) => {
      const next = prev.length > 900 ? prev.slice(prev.length - 650) : prev;
      return [...next, line];
    });
  }, []);

  const setFile = useCallback((f: File) => {
    setFileName(f.name);
    setFileMeta({ size: f.size, type: f.type || "" });
    addLog(`[input] file: ${f.name} (${prettyBytes(f.size)})`);

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const u = URL.createObjectURL(f);
    fileUrlRef.current = u;
    setFileUrl(u);

    setLockSquare(true);
    setCrop({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });

    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        try {
          v.currentTime = 0;
          v.play?.().catch(() => undefined);
        } catch {
        }
      }
    }, 50);
  }, [addLog]);

  const clearAll = useCallback(() => {
    setFileName("");
    setFileMeta({ size: 0, type: "" });
    setProgress(0);
    setLogs(["Ready"]);
    setUrl("");
    setCrop({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });

    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = "";
    setFileUrl("");
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

  const fakeProcess = useCallback(() => {
    if (!fileName) return;

    setProcessing(true);
    setProgress(0);
    setLogs([
      "[run] start",
      `[run] max size=${maxSize} MB`,
      `[run] format=${format}`,
      `[run] crop=${lockSquare ? "square" : "free"} x=${crop.x.toFixed(3)} y=${crop.y.toFixed(3)} w=${crop.w.toFixed(3)} h=${crop.h.toFixed(3)}`,
    ]);

    const steps = [
      "[meta] analyzing...",
      "[crop] applying...",
      "[encode] compressing...",
      "[size] validating...",
      "[done] under limit",
    ];

    steps.forEach((step, i) => {
      window.setTimeout(() => {
        setLogs((prev) => [...prev, step]);
        setProgress((i + 1) / steps.length);
        if (i === steps.length - 1) setProcessing(false);
      }, 650 * (i + 1));
    });
  }, [crop, fileName, format, lockSquare, maxSize]);

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
        fakeProcess();
      }
      if (e.key === "Escape") {
        clearAll();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canConvert, clearAll, fakeProcess]);

  useEffect(() => {
    return () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    };
  }, []);

  const fileBadge = fileName
    ? `${prettyBytes(fileMeta.size)}${fileMeta.type ? ` - ${fileMeta.type}` : ""}`
    : "No file";

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
          <div className="text-xs sm:text-sm text-neutral-500">{processing ? "Processing..." : fileBadge}</div>
          <div className="text-xs sm:text-sm text-neutral-500">
            {processing ? `${Math.round(progress * 100)}%` : ""}
          </div>
        </motion.div>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-12">
          <motion.section
            variants={riseVariants}
            className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-neutral-800">
              <div className="text-sm text-neutral-500">{processing ? "Processing..." : fileBadge}</div>
              <div className="text-sm text-neutral-500">{processing ? `${Math.round(progress * 100)}%` : ""}</div>
            </div>

            <div className="relative bg-neutral-950/40">
              <div className="h-[56vh] min-h-[360px] max-h-[680px] px-4 sm:px-5 py-5">
                <div
                  className="relative w-full h-full rounded-2xl border border-neutral-800 bg-black/40 overflow-hidden"
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                >
                  {fileUrl ? (
                    <video
                      ref={videoRef}
                      src={fileUrl}
                      className="absolute inset-0 w-full h-full object-contain"
                      controls
                      playsInline
                      muted
                    />
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
                    >
                      <div className="text-base sm:text-lg text-neutral-300">Drop a video</div>
                      <div className="text-sm sm:text-base text-neutral-500">or choose / paste / fetch</div>
                      <label className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-base sm:text-lg font-semibold bg-pink-600 hover:bg-pink-500 transition cursor-pointer">
                        Choose file
                        <input ref={inputRef} type="file" accept="video/*" onChange={handlePick} className="hidden" />
                      </label>
                    </div>
                  )}

                  {fileUrl ? (
                    <>
                      <div className="absolute inset-0 bg-black/10" />

                      <div
                        className="absolute border-2 border-pink-500 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                        style={{
                          left: `${crop.x * 100}%`,
                          top: `${crop.y * 100}%`,
                          width: `${crop.w * 100}%`,
                          height: `${crop.h * 100}%`,
                        }}
                        onPointerDown={(e) => startDrag(e, "move")}
                      >
                        <div className="absolute -top-8 left-0 px-2 py-1 rounded-md bg-black/70 border border-neutral-700 text-xs text-neutral-200">
                          drag to move - resize with handle
                        </div>

                        <div
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-10 rounded-md bg-pink-500/90 cursor-ew-resize"
                          onPointerDown={(e) => startDrag(e, "e")}
                        />
                        <div
                          className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-10 h-4 rounded-md bg-pink-500/90 cursor-ns-resize"
                          onPointerDown={(e) => startDrag(e, "s")}
                        />
                        <div
                          className="absolute -right-2 -bottom-2 w-5 h-5 rounded-lg bg-pink-500 cursor-nwse-resize"
                          onPointerDown={(e) => startDrag(e, "se")}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.button
                    {...hoverLift}
                    onClick={fakeProcess}
                    disabled={!canConvert}
                    className="w-full rounded-2xl px-6 py-4 sm:py-5 text-lg sm:text-xl font-semibold bg-pink-600 hover:bg-pink-500 transition disabled:opacity-40"
                  >
                    {processing ? "Processing..." : "Convert"}
                  </motion.button>

                  <motion.button
                    {...hoverLift}
                    disabled={!fileName}
                    className="w-full rounded-2xl px-6 py-4 sm:py-5 text-lg sm:text-xl font-semibold border border-neutral-800 bg-neutral-950/30 hover:border-pink-500 transition disabled:opacity-40"
                  >
                    Download
                  </motion.button>
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
                  <div className="grid gap-2">
                    <div className="text-sm text-neutral-400">Max size (MB)</div>
                    <input
                      value={maxSize}
                      onChange={(e) => setMaxSize(e.target.value)}
                      disabled={processing}
                      className="w-full bg-black/25 border border-neutral-800 rounded-xl px-4 py-3 text-lg outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm text-neutral-400">Format</div>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        {...hoverLift}
                        onClick={() => setFormat("MP4")}
                        disabled={processing}
                        className={`rounded-xl px-4 py-3 text-lg font-semibold border transition ${
                          format === "MP4" ? "border-pink-500 bg-pink-500/10" : "border-neutral-800 bg-neutral-900"
                        }`}
                      >
                        MP4
                      </motion.button>
                      <motion.button
                        {...hoverLift}
                        onClick={() => setFormat("WEBM")}
                        disabled={processing}
                        className={`rounded-xl px-4 py-3 text-lg font-semibold border transition ${
                          format === "WEBM" ? "border-pink-500 bg-pink-500/10" : "border-neutral-800 bg-neutral-900"
                        }`}
                      >
                        WEBM
                      </motion.button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm text-neutral-400">Crop</div>
                    <motion.button
                      {...hoverLift}
                      onClick={() => setLockSquare((v) => !v)}
                      disabled={!fileUrl || processing}
                      className={`rounded-xl px-4 py-3 text-lg font-semibold border transition ${
                        lockSquare ? "border-pink-500 bg-pink-500/10" : "border-neutral-800 bg-neutral-900"
                      } disabled:opacity-40`}
                    >
                      {lockSquare ? "Square" : "Free"}
                    </motion.button>
                  </div>

                  <motion.button
                    {...hoverLift}
                    onClick={() => inputRef.current?.click()}
                    disabled={processing}
                    className="rounded-xl px-4 py-3 text-base sm:text-lg font-semibold bg-neutral-800 hover:bg-neutral-700 transition disabled:opacity-40"
                  >
                    Choose file
                  </motion.button>

                  <motion.button
                    {...hoverLift}
                    onClick={clearAll}
                    disabled={processing}
                    className="rounded-xl px-4 py-3 text-base sm:text-lg font-semibold border border-neutral-800 bg-neutral-950/40 hover:border-pink-500 transition disabled:opacity-40"
                  >
                    Clear
                  </motion.button>

                  <div className="grid gap-2 pt-2 border-t border-neutral-800">
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Fetch URL (https://...)"
                      className="w-full bg-black/25 border border-neutral-800 rounded-xl px-4 py-3 text-base sm:text-lg outline-none focus:border-pink-500"
                      disabled={processing}
                    />
                    <motion.button
                      {...hoverLift}
                      onClick={fetchFromUrl}
                      disabled={processing || !url.trim()}
                      className="rounded-xl px-4 py-3 text-base sm:text-lg font-semibold bg-pink-600/15 border border-pink-500/25 hover:bg-pink-600/20 transition disabled:opacity-40"
                    >
                      Fetch
                    </motion.button>
                  </div>

                  <div className="text-xs sm:text-sm text-neutral-600">Paste: Ctrl+V - Choose: Ctrl+O</div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30">
                <div className="px-4 py-3 border-b border-neutral-800 text-xs text-neutral-500">Log</div>
                <div className="p-3 sm:p-4">
                  <div className="bg-black border border-neutral-800 rounded-2xl p-3 text-[11px] sm:text-xs font-mono leading-relaxed max-h-44 overflow-auto">
                    {logs.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
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
          <div className="tracking-[0.2em] uppercase text-[10px] text-neutral-600">
            sophisticate video tools 2026 looksawful
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a className="hover:text-neutral-200 transition" href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span className="text-neutral-700">|</span>
            <a className="hover:text-neutral-200 transition" href={licenseUrl} target="_blank" rel="noreferrer">
              License: MIT
            </a>
          </div>
        </motion.footer>
      </div>
    </motion.div>
  );
}
