import { minimumTrimGap, normalizeTrimRange } from "./hooks/trimRange";

export type TrimHandle = "start" | "end";

/** Return the next endpoint only: keyboard edits must never drag the opposite endpoint along. */
export function getTrimKeyboardValue(
  handle: TrimHandle,
  key: string,
  shiftKey: boolean,
  start: number,
  end: number,
  duration: number,
): number | null {
  if (![start, end, duration].every(Number.isFinite) || duration <= 0) return null;

  const range = normalizeTrimRange(start, end, duration);
  const gap = minimumTrimGap(duration);
  const minimum = handle === "start" ? 0 : Math.min(duration, range.start + gap);
  const maximum = handle === "start" ? Math.max(0, range.end - gap) : duration;
  const current = handle === "start" ? range.start : range.end;
  const step = shiftKey ? 1 : 0.1;

  let value: number;
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      value = current + step;
      break;
    case "ArrowLeft":
    case "ArrowDown":
      value = current - step;
      break;
    case "Home":
      value = minimum;
      break;
    case "End":
      value = maximum;
      break;
    default:
      return null;
  }
  return Math.round(Math.max(minimum, Math.min(maximum, value)) * 1000) / 1000;
}
