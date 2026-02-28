"use client";

import { motion } from "framer-motion";
import { memo } from "react";

import { fadeVariants, licenseUrl, repoUrl } from "./config";

export const AppFooter = memo(function AppFooter() {
  return (
    <motion.footer
      variants={fadeVariants}
      className="mt-3 sm:mt-4 pt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-sm text-zinc-300"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded-md bg-pink-950/40 border border-pink-800/50 text-pink-200/90 text-xs font-semibold shadow-sm">
            Ctrl+V
          </kbd>{" "}
          paste
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded-md bg-pink-950/40 border border-pink-800/50 text-pink-200/90 text-xs font-semibold shadow-sm">
            Ctrl+O
          </kbd>{" "}
          open
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded-md bg-pink-950/40 border border-pink-800/50 text-pink-200/90 text-xs font-semibold shadow-sm">
            Enter
          </kbd>{" "}
          run
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded-md bg-pink-950/40 border border-pink-800/50 text-pink-200/90 text-xs font-semibold shadow-sm">
            Esc
          </kbd>{" "}
          clear
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="tracking-[0.14em] uppercase">Sophisticate — browser-native video tools — 2026 looksawful</span>
        <span className="text-zinc-600">|</span>
        <a className="hover:text-zinc-100 transition" href={repoUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span className="text-zinc-600">|</span>
        <a className="hover:text-zinc-100 transition" href={licenseUrl} target="_blank" rel="noreferrer">
          MIT License
        </a>
      </div>
    </motion.footer>
  );
});
