"use client";

import type React from "react";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const Tooltip = memo(function Tooltip({
  text,
  children,
  position = "top",
}: {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") return;

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 220;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 34;
    const gap = 8;
    const sidePadding = 8;

    let top = position === "top" ? anchorRect.top - tooltipHeight - gap : anchorRect.bottom + gap;

    if (position === "top" && top < sidePadding) {
      top = anchorRect.bottom + gap;
    }
    if (position === "bottom" && top + tooltipHeight > window.innerHeight - sidePadding) {
      top = anchorRect.top - tooltipHeight - gap;
    }

    const unclampedLeft = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
    const left = Math.min(Math.max(unclampedLeft, sidePadding), window.innerWidth - tooltipWidth - sidePadding);

    setCoords({ left, top });
  }, [position]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  return (
    <div
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{ left: coords.left, top: coords.top }}
            className="pointer-events-none fixed px-2.5 py-1.5 rounded-lg border border-zinc-700/90 bg-zinc-900/95 backdrop-blur-md text-xs text-zinc-100 shadow-lg shadow-black/45 z-[9999] max-w-[min(320px,calc(100vw-16px))] animate-[fadeIn_150ms_ease-out]"
          >
            {text}
          </div>,
          document.body,
        )}
    </div>
  );
});
