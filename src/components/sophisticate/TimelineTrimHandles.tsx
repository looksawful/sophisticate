"use client";

import type { KeyboardEvent, PointerEventHandler } from "react";

import { trimRangeFromKeyboard } from "./trimKeyboard";
import { getTimelineValues } from "./timelineValues";

type TimelineTrimHandlesProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onStartPointerDown: PointerEventHandler<HTMLDivElement>;
  onEndPointerDown: PointerEventHandler<HTMLDivElement>;
  onTrimChange: (start: number, end: number) => void;
  processing?: boolean;
};

const handleClass =
  "absolute top-1/2 z-30 h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize pointer-events-auto rounded-lg hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/80 before:content-[''] before:absolute before:inset-y-1 before:left-1/2 before:w-2 before:-translate-x-1/2 before:rounded-sm before:bg-zinc-400/90 hover:before:bg-pink-400";

export function TimelineTrimHandles({
  duration,
  trimStart,
  trimEnd,
  onStartPointerDown,
  onEndPointerDown,
  onTrimChange,
  processing = false,
}: TimelineTrimHandlesProps) {
  const { trimStartPercent: startPercent, trimEndPercent: endPercent } = getTimelineValues(
    duration,
    trimStart,
    trimEnd,
    0,
  );

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeStart = Number.isFinite(trimStart) ? Math.max(0, Math.min(trimStart, safeDuration)) : 0;
  const safeEnd = Number.isFinite(trimEnd) ? Math.max(safeStart, Math.min(trimEnd, safeDuration)) : safeDuration;
  const minGap = Math.min(0.1, safeDuration);
  const disabled = processing || safeDuration <= 0;

  const onTrimKey = (handle: "start" | "end") => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const range = trimRangeFromKeyboard({
      handle,
      key: event.key,
      shiftKey: event.shiftKey,
      duration: safeDuration,
      start: safeStart,
      end: safeEnd,
    });
    if (!range) return;
    event.preventDefault();
    event.stopPropagation();
    onTrimChange(range.start, range.end);
  };

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
        aria-valuemax={Math.max(0, safeEnd - minGap)}
        aria-valuenow={safeStart}
        aria-valuetext={`${safeStart.toFixed(1)} seconds`}
        aria-disabled={disabled}
        onKeyDown={onTrimKey("start")}
        onPointerDown={onStartPointerDown}
      />
      <div
        data-trim-handle="end"
        style={{ left: `${endPercent}%` }}
        className={handleClass}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Trim end"
        aria-orientation="horizontal"
        aria-valuemin={Math.min(safeDuration, safeStart + minGap)}
        aria-valuemax={safeDuration}
        aria-valuenow={safeEnd}
        aria-valuetext={`${safeEnd.toFixed(1)} seconds`}
        aria-disabled={disabled}
        onKeyDown={onTrimKey("end")}
        onPointerDown={onEndPointerDown}
      />
    </>
  );
}
