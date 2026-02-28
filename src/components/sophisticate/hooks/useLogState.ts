"use client";

import { useCallback, useMemo, useState } from "react";

export function useLogState() {
  const [logs, setLogs] = useState<string[]>(["Ready"]);
  const [logFilter, setLogFilter] = useState<"all" | "process" | "errors" | "ffmpeg">("all");
  const [logQuery, setLogQuery] = useState("");

  const addLog = useCallback((line: string) => {
    setLogs((prev) => {
      const next = prev.length > 900 ? prev.slice(prev.length - 650) : prev;
      return [...next, line];
    });
  }, []);

  const resetLogs = useCallback(() => {
    setLogs(["Ready"]);
  }, []);

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return logs.filter((line) => {
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
  }, [logFilter, logQuery, logs]);

  return {
    logs,
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
