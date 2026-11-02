import { normalizeTrimRange, type TrimRange } from "./hooks/trimRange";

type TrimKeyboardInput = {
  handle: "start" | "end";
  key: string;
  shiftKey: boolean;
  duration: number;
  start: number;
  end: number;
};

/** Move only the chosen endpoint, preserving the opposite endpoint and the minimum trim gap. */
export function trimRangeFromKeyboard(input: TrimKeyboardInput): TrimRange | null {
  const { duration, start, end, handle, key, shiftKey } = input;
  if (![duration, start, end].every(Number.isFinite) || duration <= 0) return null;

  const delta = shiftKey ? 1 : 0.1;
  const current = handle === "start" ? start : end;
  let next: number;
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      next = current - delta;
      break;
    case "ArrowRight":
    case "ArrowUp":
      next = current + delta;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = duration;
      break;
    default:
      return null;
  }

  const gap = Math.min(0.1, duration);
  const min = handle === "start" ? 0 : start + gap;
  const max = handle === "start" ? end - gap : duration;
  const clamped = Math.max(min, Math.min(max, next));

  return handle === "start"
    ? normalizeTrimRange(clamped, end, duration)
    : normalizeTrimRange(start, clamped, duration);
}
