"use client";

import type { PointerEventHandler } from "react";

type TimelineTrimHandlesProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onStartPointerDown: PointerEventHandler<HTMLDivElement>;
  onEndPointerDown: PointerEventHandler<HTMLDivElement>;
};

export function TimelineTrimHandles({
  duration,
  trimStart,
  trimEnd,
  onStartPointerDown,
  onEndPointerDown,
}: TimelineTrimHandlesProps) {
  const timelineMax = Math.max(duration, 0.1);
  const startPercent = (Math.max(0, Math.min(trimStart, timelineMax)) / timelineMax) * 100;
  const endPercent = (Math.max(0, Math.min(trimEnd, timelineMax)) / timelineMax) * 100;

  return (
    <>
      <div
        data-trim-handle="start"
        style={{ left: `${startPercent}%` }}
        className="absolute top-1/2 z-30 h-9 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-zinc-400/90 hover:bg-pink-400 hover:scale-110 transition pointer-events-auto cursor-ew-resize"
        onPointerDown={onStartPointerDown}
      />
      <div
        data-trim-handle="end"
        style={{ left: `${endPercent}%` }}
        className="absolute top-1/2 z-30 h-9 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-zinc-400/90 hover:bg-pink-400 hover:scale-110 transition pointer-events-auto cursor-ew-resize"
        onPointerDown={onEndPointerDown}
      />
    </>
  );
}
