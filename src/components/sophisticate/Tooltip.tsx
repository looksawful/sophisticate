"use client";

import type React from "react";

export function Tooltip({
  text,
  children,
  position = "top",
}: {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}) {
  return (
    <div className="relative group">
      {children}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 ${
          position === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
