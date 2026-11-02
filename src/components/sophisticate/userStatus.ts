type LogMessage = { text: string };

/** Announce user-visible state transitions, not high-frequency encoder logs. */
export function getUserStatus(
  processing: boolean,
  completed: boolean,
  logs: ReadonlyArray<LogMessage>,
): { status: string; error: string } {
  if (processing) return { status: "Processing video", error: "" };
  if (completed) return { status: "Video ready to download", error: "" };

  const latest = logs[logs.length - 1]?.text ?? "";
  if (latest.startsWith("[error]")) {
    return { status: "", error: latest.slice("[error]".length).trim() };
  }
  if (latest.startsWith("[cancelled]")) {
    return { status: "Processing cancelled", error: "" };
  }
  return { status: "", error: "" };
}
