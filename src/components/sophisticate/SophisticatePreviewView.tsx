"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { AppFooter } from "./AppFooter";
import { containerVariants, fadeVariants } from "./config";
import { LogPanel } from "./LogPanel";
import { PreviewPane } from "./PreviewPane";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { SidebarControls } from "./SidebarControls";
import { getUserStatus } from "./userStatus";
import type { SophisticateController } from "./useSophisticateController";

export function SophisticatePreviewView({ c }: { c: SophisticateController }) {
  const prefersReducedMotion = useReducedMotion();
  const { status, error } = getUserStatus(c.processing, Boolean(c.showResult && c.resultUrl), c.logs);

  return (
    <motion.div
      className="relative min-h-screen bg-black/80 text-zinc-50 font-sans"
      onPaste={c.handlePaste}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-7 py-5 sm:py-6 min-h-screen flex flex-col">
        <input aria-label="Choose video file" ref={c.inputRef} type="file" accept="video/*" onChange={c.handlePick} className="hidden" />

        <main className="flex-1 flex flex-col">
          <h1 className="sr-only">Sophisticate video editor</h1>
          <div role="status" aria-live="polite" className="sr-only">{status}</div>
          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          <motion.div variants={fadeVariants} className="flex items-center justify-end gap-4 mb-4">
            <div className="text-base text-zinc-300">
              {c.fileBadge}
            </div>
          </motion.div>

          <AnimatePresence>
            {c.processing && <ProcessingOverlay progress={c.progress} prefersReducedMotion={!!prefersReducedMotion} />}
          </AnimatePresence>

          <div className="grid gap-4 lg:gap-5 lg:grid-cols-12">
            <PreviewPane c={c} />
            <SidebarControls c={c} />
          </div>

          <LogPanel c={c} />
        </main>
        <AppFooter />
      </div>
    </motion.div>
  );
}
