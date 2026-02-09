"use client";

import { motion } from "framer-motion";

import { ASPECT_PRESETS, riseVariants } from "./config";
import { Button, FieldLabel, Input } from "./controls";
import { Tooltip } from "./Tooltip";
import { ui } from "./ui";
import type { SophisticateController } from "./useSophisticateController";

export function SidebarControls({ c }: { c: SophisticateController }) {
  return (
    <motion.aside variants={riseVariants} className={`lg:col-span-4 ${ui.panelStrong} bg-zinc-950/95 shadow-xl`}>
      <div className="h-full p-4 sm:p-5 grid gap-4">
        <section className="rounded-xl border border-zinc-800/90 p-3.5 grid gap-3">
          <FieldLabel className="text-base">Aspect ratio</FieldLabel>
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            {ASPECT_PRESETS.map((preset) => (
              <Tooltip key={preset.label} text={preset.desc} position="bottom">
                <Button
                  onClick={() => c.applyPreset(preset)}
                  disabled={!c.fileUrl || c.processing}
                  variant={c.activePreset === preset.label ? "chipActive" : "chip"}
                  size="md"
                  className="h-11 w-[58px] px-0 text-sm font-semibold"
                >
                  {preset.label}
                </Button>
              </Tooltip>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800/90 p-3.5 grid gap-3">
          <div className="flex items-center justify-between">
            <FieldLabel className="text-base">Crop & zoom</FieldLabel>
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
              c.setActivePreset("Free");
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
            <Tooltip text="Target output file size" position="top">
              <div className="grid gap-2.5">
                <FieldLabel className="text-base">Max size (MB)</FieldLabel>
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
                    disabled={c.processing}
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
                <div className="flex items-center justify-between">
                  <FieldLabel>Loop</FieldLabel>
                  <div className="text-sm text-zinc-300 font-mono">{c.loopCount}×</div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      onClick={() => c.setLoopCount(n)}
                      disabled={c.processing}
                      variant={c.loopCount === n ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold"
                    >
                      {n}×
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>Quality</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <Button
                      key={q}
                      onClick={() => c.setQuality(q)}
                      disabled={c.processing}
                      variant={c.quality === q ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold capitalize"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <div className="text-sm text-zinc-400">
                  {c.quality === "low" ? "Fast encode, larger file" : c.quality === "high" ? "Slow encode, best quality" : "Balanced"}
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>FPS</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {[0, 15, 24, 30, 60].map((f) => (
                    <Button
                      key={f}
                      onClick={() => c.setFps(f)}
                      disabled={c.processing}
                      variant={c.fps === f ? "chipActive" : "chip"}
                      size="sm"
                      className="font-semibold"
                    >
                      {f === 0 ? "Auto" : f}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <FieldLabel>Audio in export</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => c.setIncludeAudio(true)}
                    disabled={c.processing}
                    variant={c.includeAudio ? "chipActive" : "chip"}
                    size="sm"
                    className="font-semibold"
                  >
                    Audio on
                  </Button>
                  <Button
                    onClick={() => c.setIncludeAudio(false)}
                    disabled={c.processing}
                    variant={!c.includeAudio ? "chipActive" : "chip"}
                    size="sm"
                    className="font-semibold"
                  >
                    Muted
                  </Button>
                </div>
              </div>
            </div>
          </details>
        </section>

      </div>
    </motion.aside>
  );
}
