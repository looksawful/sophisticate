"use client";

import { Pause, Play } from "lucide-react";
import { Range } from "react-range";

type TrimTimelineProps = {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  processing: boolean;
  onSeek: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onJumpToTrimStart: () => void;
  playing?: boolean;
  onTogglePlay?: () => void;
  formatTime: (value: number) => string;
};

export function TrimTimeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  processing,
  onSeek,
  onTrimChange,
  onJumpToTrimStart,
  playing = false,
  onTogglePlay,
  formatTime,
}: TrimTimelineProps) {
  if (duration <= 0) return null;

  const safeCurrent = Math.max(0, Math.min(currentTime, duration));

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
        <span>Trim</span>
        <span>{formatTime(trimStart)} - {formatTime(trimEnd)} ({formatTime(trimEnd - trimStart)})</span>
      </div>

      <div className="mb-3">
        <Range
          step={0.1}
          min={0}
          max={duration}
          values={[trimStart, trimEnd]}
          onChange={(values) => onTrimChange(values[0], values[1])}
          renderTrack={({ props, children }) => {
            const left = (trimStart / duration) * 100;
            const right = (trimEnd / duration) * 100;
            return (
              <div {...props} className="h-8 flex items-center">
                <div className="h-1.5 w-full rounded-full bg-neutral-800 relative">
                  <div
                    className="absolute top-0 h-1.5 rounded-full bg-pink-500"
                    style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
                  />
                  {children}
                </div>
              </div>
            );
          }}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              className="h-4 w-4 rounded-full border border-pink-300 bg-pink-500 shadow-[0_0_0_4px_rgba(236,72,153,0.2)]"
              aria-label={index === 0 ? "Trim start" : "Trim end"}
            />
          )}
          disabled={processing}
        />
      </div>

      <div className="flex items-center gap-2">
        {onTogglePlay && (
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={processing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 transition hover:border-pink-400 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} className="translate-x-[1px]" />}
          </button>
        )}

        <div className="flex-1">
          <Range
            step={0.1}
            min={0}
            max={duration}
            values={[safeCurrent]}
            onChange={(values) => onSeek(values[0])}
            renderTrack={({ props, children }) => (
              <div {...props} className="h-8 flex items-center">
                <div className="h-1.5 w-full rounded-full bg-neutral-800 relative">
                  <div
                    className="absolute top-0 left-0 h-1.5 rounded-full bg-neutral-300"
                    style={{ width: `${(safeCurrent / duration) * 100}%` }}
                  />
                  {children}
                </div>
              </div>
            )}
            renderThumb={({ props }) => (
              <div
                {...props}
                className="h-3.5 w-3.5 rounded-full border border-neutral-200 bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
                aria-label="Current time"
              />
            )}
            disabled={processing}
          />
        </div>

        <button
          type="button"
          onClick={onJumpToTrimStart}
          disabled={processing}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 transition hover:border-pink-400 disabled:opacity-40"
        >
          To start
        </button>
      </div>
    </div>
  );
}
