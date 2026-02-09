"use client";

import { Input, Select } from "./controls";
import { ui } from "./ui";
import type { SophisticateController } from "./useSophisticateController";

const getLogLineClass = (line: string) => {
  if (line.startsWith("[error]")) return "border-red-900/60 bg-red-950/30 text-red-200";
  if (line.startsWith("[cancelled]")) return "border-amber-900/60 bg-amber-950/25 text-amber-200";
  if (line.startsWith("[done]") || line.startsWith("[complete]")) return "border-emerald-900/60 bg-emerald-950/25 text-emerald-200";
  if (line.startsWith("[run]")) return "border-fuchsia-900/60 bg-fuchsia-950/20 text-fuchsia-200";
  if (line.startsWith("[encode]")) return "border-cyan-900/60 bg-cyan-950/20 text-cyan-200";
  if (line.startsWith("[crop]")) return "border-sky-900/60 bg-sky-950/20 text-sky-200";
  if (line.startsWith("[size]")) return "border-violet-900/60 bg-violet-950/20 text-violet-200";
  if (line.startsWith("[input]") || line.startsWith("[meta]") || line.startsWith("[init]")) return "border-zinc-700/60 bg-zinc-900/70 text-zinc-200";
  if (line.startsWith("[ffmpeg]")) return "border-zinc-800/60 bg-zinc-950/70 text-zinc-300";
  return "border-zinc-800/60 bg-zinc-950/60 text-zinc-300";
};

export function LogPanel({ c }: { c: SophisticateController }) {
  return (
    <details className={`mt-4 ${ui.panelStrong}`}>
      <summary className="px-4 py-2.5 cursor-pointer select-none flex items-center justify-between text-xs text-zinc-300 hover:text-zinc-100 transition">
        <span>Log</span>
        <span className="text-xs text-zinc-400">{c.filteredLogs.length} / {c.logs.length}</span>
      </summary>

      <div className="p-3 border-t border-zinc-800 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={c.logFilter}
            onChange={(e) => c.setLogFilter(e.target.value as typeof c.logFilter)}
            className="px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="process">Process</option>
            <option value="errors">Errors</option>
            <option value="ffmpeg">FFmpeg</option>
          </Select>
          <Input
            value={c.logQuery}
            onChange={(e) => c.setLogQuery(e.target.value)}
            placeholder="Search log"
            className="min-w-[180px] flex-1 px-2 py-1 text-xs"
          />
        </div>

        <div className="bg-black/80 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono leading-relaxed max-h-56 overflow-auto">
          {c.filteredLogs.map((line, i) => (
            <div key={i} className={`mb-1 rounded-md border px-2 py-1 ${getLogLineClass(line)}`}>
              {line}
            </div>
          ))}
          <div ref={c.logsEndRef} />
        </div>
      </div>
    </details>
  );
}
