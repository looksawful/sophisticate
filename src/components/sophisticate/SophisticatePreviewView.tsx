"use client";

import { motion, useReducedMotion } from "framer-motion";

import { containerVariants, fadeVariants } from "./config";
import { AppFooter } from "./AppFooter";
import { LogPanel } from "./LogPanel";
import { PreviewPane } from "./PreviewPane";
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
      <div className="mx-auto max-w-[1500px] px-5 sm:px-7 py-7 sm:py-9 min-h-screen flex flex-col">
        <input ref={c.inputRef} type="file" accept="video/*" onChange={c.handlePick} className="hidden" />

        <div className="flex-1">
          <motion.div variants={fadeVariants} className="flex items-center justify-end gap-4 mb-4">
            <div className="text-base text-zinc-300">
              {c.processing ? `Processing ${Math.round(c.progress * 100)}%` : c.fileBadge}
            </div>
          </motion.div>

          {c.processing && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scaleX: 0 }}
              animate={prefersReducedMotion ? false : { opacity: 1, scaleX: 1 }}
              className="mb-5 h-2 rounded-full bg-zinc-800 overflow-hidden origin-left"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full"
                initial={prefersReducedMotion ? false : { width: 0 }}
                animate={{ width: `${Math.round(c.progress * 100)}%` }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </motion.div>
          )}

          <div className="grid gap-5 lg:gap-6 lg:grid-cols-12">
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
