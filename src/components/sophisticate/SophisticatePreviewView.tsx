"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { AppFooter } from "./AppFooter";
import { containerVariants, fadeVariants } from "./config";
import { LogPanel } from "./LogPanel";
import { PreviewPane } from "./PreviewPane";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { SidebarControls } from "./SidebarControls";
import type { SophisticateController } from "./useSophisticateController";

export function SophisticatePreviewView({ c }: { c: SophisticateController }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative min-h-screen bg-black/80 text-zinc-50 font-sans"
      onPaste={c.handlePaste}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-7 py-5 sm:py-6 min-h-screen flex flex-col">
        <input
          ref={c.inputRef}
          type="file"
          accept="video/*,.mp4,.m4v,.mov,.webm"
          onChange={c.handlePick}
          className="hidden"
        />

        <div className="flex-1 flex flex-col">
          <motion.div variants={fadeVariants} className="flex items-center justify-end gap-4 mb-4">
            <div className="text-base text-zinc-300">
              {c.fileBadge}
            </div>
          </motion.div>

          {c.validationError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/40 bg-red-950/35 px-4 py-3 text-sm text-red-200"
            >
              {c.validationError}
            </div>
          )}

          <AnimatePresence>
            {c.processing && <ProcessingOverlay progress={c.progress} prefersReducedMotion={!!prefersReducedMotion} />}
          </AnimatePresence>

          <div className="grid gap-4 lg:gap-5 lg:grid-cols-12">
            <PreviewPane c={c} />
            <SidebarControls c={c} />
          </div>

          <LogPanel c={c} />
        </div>
        <AppFooter />
      </div>
    </motion.div>
  );
}
