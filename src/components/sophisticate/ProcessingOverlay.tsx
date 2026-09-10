"use client";

import { motion } from "framer-motion";
import { memo, useMemo } from "react";

interface ProcessingOverlayProps {
  progress: number;
  prefersReducedMotion: boolean;
}

function getStageInfo(progress: number): { label: string; color: string } {
  if (progress < 0.1) return { label: "Preparing video", color: "text-zinc-300" };
  if (progress < 0.92) return { label: "Processing video", color: "text-fuchsia-300" };
  if (progress < 1) return { label: "Finalizing", color: "text-emerald-300" };
  return { label: "Complete", color: "text-green-300" };
}

export const ProcessingOverlay = memo(function ProcessingOverlay({
  progress,
  prefersReducedMotion,
}: ProcessingOverlayProps) {
  const pct = Math.round(progress * 100);
  const stage = useMemo(() => getStageInfo(progress), [progress]);

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl p-4 shadow-lg shadow-pink-500/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {pct < 100 && (
              <motion.div
                className="relative flex h-2.5 w-2.5"
                animate={prefersReducedMotion ? {} : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
              </motion.div>
            )}
            {pct >= 100 && <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />}
            <span className={`text-sm font-semibold ${stage.color} transition-colors duration-300`}>{stage.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-zinc-100">{pct}</span>
            <span className="text-sm font-semibold text-zinc-400">%</span>
          </div>
        </div>

        <div className="relative h-3 rounded-full bg-zinc-800/80 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-pink-500/20 blur-md"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          <motion.div
            className="relative h-full rounded-full bg-gradient-to-r from-pink-600 via-fuchsia-500 to-pink-400"
            initial={prefersReducedMotion ? undefined : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {pct < 100 && !prefersReducedMotion && (
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex justify-between mt-2 px-0.5">
          {[
            { at: 0.1, label: "Load" },
            { at: 0.55, label: "Process" },
            { at: 0.92, label: "Finish" },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-1">
              <div
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                  progress >= step.at ? "bg-pink-400" : "bg-zinc-700"
                }`}
              />
              <span
                className={`text-xs transition-colors duration-300 ${
                  progress >= step.at ? "text-zinc-300" : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});
