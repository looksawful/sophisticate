export type TimelineValues = {
  timelineMax: number;
  trimStartPercent: number;
  trimEndPercent: number;
  playheadPercent: number;
};

const FALLBACK_TIMELINE_MAX = 0.1;

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

const toPercent = (value: number, timelineMax: number, fallback: number) => {
  const safeValue = Math.max(0, Math.min(finiteOr(value, fallback), timelineMax));
  return (safeValue / timelineMax) * 100;
};

export function getTimelineValues(duration: number, trimStart: number, trimEnd: number, currentTime: number): TimelineValues {
  const timelineMax = Number.isFinite(duration) && duration > 0 ? duration : FALLBACK_TIMELINE_MAX;

  return {
    timelineMax,
    trimStartPercent: toPercent(trimStart, timelineMax, 0),
    trimEndPercent: toPercent(trimEnd, timelineMax, timelineMax),
    playheadPercent: toPercent(currentTime, timelineMax, 0),
  };
}
