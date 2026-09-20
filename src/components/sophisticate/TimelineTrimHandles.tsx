"use client";

import type { PointerEventHandler } from "react";

type TimelineTrimHandlesProps = {
  startPercent: number;
  endPercent: number;
  onStartPointerDown: PointerEventHandler<HTMLDivElement>;
  onEndPointerDown: PointerEventHandler<HTMLDivElement>;
};

export function TimelineTrimHandles({
  startPercent,
  endPercent,
  onStartPointerDown,
  onEndPointerDown,
}: TimelineTrimHandlesProps) {
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
