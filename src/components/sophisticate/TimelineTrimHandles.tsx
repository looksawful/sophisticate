"use client";

import type { KeyboardEvent, PointerEventHandler } from "react";

import { minimumTrimGap } from "./hooks/trimRange";
import { getTrimKeyboardValue, type TrimHandle } from "./trimKeyboard";
import { getTimelineValues } from "./timelineValues";

type TimelineTrimHandlesProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onStartPointerDown: PointerEventHandler<HTMLDivElement>;
  onEndPointerDown: PointerEventHandler<HTMLDivElement>;
  onStartChange: (next: number) => void;
  onEndChange: (next: number) => void;
  disabled?: boolean;
};

export function TimelineTrimHandles({
  duration,
  trimStart,
  trimEnd,
  onStartPointerDown,
  onEndPointerDown,
  onStartChange,
  onEndChange,
  disabled = false,
}: TimelineTrimHandlesProps) {
  const { trimStartPercent: startPercent, trimEndPercent: endPercent } = getTimelineValues(
    duration,
    trimStart,
    trimEnd,
    0,
  );
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const start = Number.isFinite(trimStart) ? Math.max(0, Math.min(trimStart, safeDuration)) : 0;
  const end = Number.isFinite(trimEnd) ? Math.max(start, Math.min(trimEnd, safeDuration)) : safeDuration;
  const gap = minimumTrimGap(safeDuration);

  const handleKey = (handle: TrimHandle, event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const next = getTrimKeyboardValue(handle, event.key, event.shiftKey, start, end, safeDuration);
    if (next === null) return;
    event.preventDefault();
    if (handle === "start") onStartChange(next);
    else onEndChange(next);
  };

  const handleClass =
    "absolute top-1/2 z-30 h-11 w-6 -translate-x-1/2 -translate-y-1/2 rounded-sm cursor-ew-resize pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 hover:bg-pink-500/10 hover:[&>span]:bg-pink-400";
  const handleMark =
    "pointer-events-none absolute left-1/2 top-1/2 h-9 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-zinc-400/90";

  return (
    <>
      <div
        data-trim-handle="start"
        style={{ left: `${startPercent}%` }}
        className={handleClass}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Trim start"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, end - gap)}
        aria-valuenow={start}
        aria-valuetext={`${start.toFixed(2)} seconds`}
        aria-disabled={disabled}
        onKeyDown={(event) => handleKey("start", event)}
        onPointerDown={onStartPointerDown}
      >
        <span aria-hidden="true" className={handleMark} />
      </div>
      <div
        data-trim-handle="end"
        style={{ left: `${endPercent}%` }}
        className={handleClass}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Trim end"
        aria-orientation="horizontal"
        aria-valuemin={Math.min(safeDuration, start + gap)}
        aria-valuemax={safeDuration}
        aria-valuenow={end}
        aria-valuetext={`${end.toFixed(2)} seconds`}
        aria-disabled={disabled}
        onKeyDown={(event) => handleKey("end", event)}
        onPointerDown={onEndPointerDown}
      >
        <span aria-hidden="true" className={handleMark} />
      </div>
    </>
  );
}
