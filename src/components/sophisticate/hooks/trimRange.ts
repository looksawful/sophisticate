export type TrimRange = {
  start: number;
  end: number;
};

const NOMINAL_MIN_GAP_SECONDS = 0.1;

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

export function normalizeTrimRange(start: number, end: number, duration: number): TrimRange {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: 0 };
  }

  const max = duration;
  const minGap = Math.min(NOMINAL_MIN_GAP_SECONDS, max);
  const requestedStart = finiteOr(start, 0);
  const requestedEnd = finiteOr(end, max);
  const clampedStart = Math.max(0, Math.min(requestedStart, max));
  const clampedEnd = Math.max(0, Math.min(requestedEnd, max));

  if (clampedEnd >= clampedStart + minGap) {
    return { start: clampedStart, end: clampedEnd };
  }

  if (clampedStart + minGap <= max) {
    return { start: clampedStart, end: clampedStart + minGap };
  }

  return { start: Math.max(0, max - minGap), end: max };
}
