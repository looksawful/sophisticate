"use client";

import { motion } from "framer-motion";
import { memo } from "react";

import { RATIO_PRESETS, riseVariants, SPECIAL_PRESETS } from "./config";
import { Button, FieldLabel, Input } from "./controls";
import { controllerEqual } from "./memoHelpers";
import { Tooltip } from "./Tooltip";
import { ui } from "./ui";
import type { SophisticateController } from "./useSophisticateController";

export const SidebarControls = memo(function SidebarControls({ c }: { c: SophisticateController }) {
  return (
    <motion.aside variants={riseVariants} className={`lg:col-span-4 ${ui.panelStrong} bg-zinc-950/95 shadow-xl`}>
      <div className="h-full p-4 sm:p-5 grid gap-4 overflow-y-auto max-h-[calc(100dvh-100px)]">
        <section className="rounded-xl border border-zinc-800/90 p-3.5 grid gap-3">
          <div className="flex items-center justify-between">
            <FieldLabel className="text-base">Aspect ratio</FieldLabel>
            <button
              type="button"
              onClick={() => c.setCropEnabled((v) => !v)}
              className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${
                c.cropEnabled
                  ? "bg-pink-500/15 text-pink-300 border border-pink-500/40"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}
            >
              Crop {c.cropEnabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className={`transition-opacity ${c.cropEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              {SPECIAL_PRESETS.map((preset) => (
                <Tooltip key={preset.label} text={preset.desc} position="bottom">
                  <Button
                    onClick={() => c.applyPreset(preset)}
                    disabled={!c.fileUrl || c.processing}
                    variant={c.activePreset === preset.label ? "chipActive" : "chip"}
                    size="sm"
                    className="h-9 min-w-[52px] px-2 text-sm font-semibold"
                  >
                    {preset.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
            {c.activePreset === "Free" && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={c.customW}
                  onChange={(e) => c.applyCustomRatio(e.target.value, c.customH)}
                  disabled={!c.fileUrl || c.processing}
                  className="w-16 px-2 py-1.5 text-sm tabular-nums text-center"
                  placeholder="W"
                />
                <span className="text-zinc-500 font-semibold">:</span>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={c.customH}
                  onChange={(e) => c.applyCustomRatio(c.customW, e.target.value)}
                  disabled={!c.fileUrl || c.processing}
                  className="w-16 px-2 py-1.5 text-sm tabular-nums text-center"
                  placeholder="H"
                />
              </div>
            )}
            <div className="my-2 h-px bg-zinc-700/60" />
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              {RATIO_PRESETS.map((preset) => (
                <Tooltip key={preset.label} text={preset.desc} position="bottom">
                  <Button
                    onClick={() => c.applyPreset(preset)}
                    disabled={!c.fileUrl || c.processing}
                    variant={c.activePreset === preset.label ? "chipActive" : "chip"}
                    size="sm"
                    className="h-9 min-w-[52px] px-2 text-sm font-semibold"
                  >
                    {preset.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800/90 p-3.5 grid gap-3">
          <div className="flex items-center justify-between">
            <FieldLabel className="text-base">Crop</FieldLabel>
            <div className="text-sm text-zinc-300 font-mono">{c.zoom.toFixed(2)}x</div>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={c.zoomStep}
            value={c.zoom}
            onChange={(e) => c.setZoom(parseFloat(e.target.value))}
            disabled={!c.fileUrl || c.processing}
            className="soph-range w-full"
          />
          <Button
            onClick={() => {
              c.setCrop({ x: 0, y: 0, w: 1, h: 1 });
              c.setActivePreset("Original");
              c.setZoom(1);
              c.setUiCrop({ x: 0, y: 0 });
            }}
            disabled={!c.fileUrl || c.processing}
            size="sm"
            className="w-full py-2.5 font-medium"
          >
            Reset crop
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-800/90 overflow-hidden flex flex-col">
          <div className="p-3.5 grid gap-3">
            <div className="flex items-center justify-between">
              <FieldLabel className="text-base">Max size (MB)</FieldLabel>
              <button
                type="button"
                onClick={() => c.setSizeLimitEnabled((v) => !v)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${
                  c.sizeLimitEnabled
                    ? "bg-pink-500/15 text-pink-300 border border-pink-500/40"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                }`}
              >
                Size {c.sizeLimitEnabled ? "ON" : "OFF"}
              </button>
            </div>
            <Tooltip text="Target output file size" position="top">
              <div
                className={`transition-opacity ${c.sizeLimitEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
              >
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={c.maxSize}
                  onChange={(e) => c.setMaxSize(e.target.value)}
                  disabled={c.processing}
                  className="w-full px-3.5 py-3 text-xl font-semibold tabular-nums"
                />
              </div>
            </Tooltip>
            <div className="grid gap-2.5">
              <FieldLabel className="text-base">Format</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {(["MP4", "WEBM"] as const).map((format) => (
                  <Button
                    key={format}
                    onClick={() => c.setFormat(format)}
                    disabled={!c.fileUrl || c.processing}
                    variant={c.format === format ? "chipActive" : "chip"}
                    size="sm"
                    className="py-3 font-semibold"
                  >
                    {format}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <details className="mt-auto">
            <summary className="px-3.5 py-2.5 cursor-pointer select-none text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition">
              Advanced settings
            </summary>
            <div className="px-3.5 pb-3.5 grid gap-3 pt-1">
              <div className="grid gap-2">
                <FieldLabel>Quality</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <Button
                      key={q}
                      onClick={() => c.setQuality(q)}
                      disabled={!c.fileUrl || c.processing}
                      variant={c.quality === q ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold capitalize"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <div className="text-sm text-zinc-400">
                  {c.quality === "low"
                    ? "Fast encode, larger file"
                    : c.quality === "high"
                      ? "Slow encode, best quality"
                      : "Balanced"}
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>Speed</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <Button
                      key={s}
                      onClick={() => c.setSpeed(s)}
                      disabled={!c.fileUrl || c.processing}
                      variant={c.speed === s ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold"
                    >
                      {s}x
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>FPS</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => c.setFps(0)}
                    disabled={!c.fileUrl || c.processing}
                    variant={c.fps === 0 ? "chipActive" : "chip"}
                    size="sm"
                    className="font-semibold"
                  >
                    Off
                  </Button>
                  {[15, 24, 30, 60].map((f) => (
                    <Button
                      key={f}
                      onClick={() => c.setFps(f)}
                      disabled={!c.fileUrl || c.processing}
                      variant={c.fps === f ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
    </motion.aside>
  );
}, controllerEqual);
