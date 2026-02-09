"use client";

import { motion } from "framer-motion";

import { fadeVariants, licenseUrl, repoUrl } from "./config";

export function AppFooter() {
  return (
    <motion.footer
      variants={fadeVariants}
      className="mt-6 sm:mt-8 pt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-zinc-300"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Ctrl+V</kbd> paste
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Ctrl+O</kbd> open
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Enter</kbd> run
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Esc</kbd> clear
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
}
