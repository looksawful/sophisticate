"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type LogEntry = { id: number; text: string };

export function useLogState() {
  const [entries, setEntries] = useState<LogEntry[]>([{ id: 0, text: "Ready" }]);
  const nextIdRef = useRef(1);
  const [logFilter, setLogFilter] = useState<"all" | "process" | "errors" | "ffmpeg">("all");
  const [logQuery, setLogQuery] = useState("");

  const addLog = useCallback((line: string) => {
    setEntries((prev) => {
      const next = prev.length > 900 ? prev.slice(prev.length - 650) : prev;
      return [...next, { id: nextIdRef.current++, text: line }];
    });
  }, []);

  const setLogs = useCallback((lines: string[]) => {
    setEntries(lines.map((text) => ({ id: nextIdRef.current++, text })));
  }, []);

  const resetLogs = useCallback(() => {
    setEntries([{ id: nextIdRef.current++, text: "Ready" }]);
  }, []);

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const line = entry.text;
      const byFilter =
        logFilter === "all"
          ? true
          : logFilter === "errors"
            ? line.startsWith("[error]")
            : logFilter === "ffmpeg"
              ? line.startsWith("[ffmpeg]")
              : line.startsWith("[run]") ||
                line.startsWith("[encode]") ||
                line.startsWith("[crop]") ||
                line.startsWith("[size]") ||
                line.startsWith("[done]") ||
                line.startsWith("[complete]") ||
                line.startsWith("[cancelled]");
      if (!byFilter) return false;
      if (!q) return true;
      return line.toLowerCase().includes(q);
    });
  }, [logFilter, logQuery, entries]);

  return {
    logs: entries,
    setLogs,
    filteredLogs,
    logFilter,
    setLogFilter,
    logQuery,
    setLogQuery,
    addLog,
    resetLogs,
  };
}
