export type Crop = { x: number; y: number; w: number; h: number };

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeCrop(next: Crop): Crop {
  let { x, y, w, h } = next;
  w = clamp01(w);
  h = clamp01(h);
  x = clamp01(x);
  y = clamp01(y);

  if (x + w > 1) x = 1 - w;
  if (y + h > 1) y = 1 - h;

  return { x, y, w, h };
}

export function prettyBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "N/A";
  const units = ["B", "KB", "MB", "GB"] as const;
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const d = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${n.toFixed(d)} ${units[i]}`;
}

export function cropPixels(crop: Crop, videoWidth: number, videoHeight: number) {
  const x = Math.round(crop.x * videoWidth);
  const y = Math.round(crop.y * videoHeight);
  let w = Math.round(crop.w * videoWidth);
  let h = Math.round(crop.h * videoHeight);
  if (w % 2 !== 0) w -= 1;
  if (h % 2 !== 0) h -= 1;
  return { x, y, w: Math.max(2, w), h: Math.max(2, h) };
}

export function targetBitrate(maxSizeMB: number, durationSec: number, audioBitrateKbps = 128) {
  const bytes = maxSizeMB * 1024 * 1024;
  const bits = bytes * 8;
  const totalKbps = bits / Math.max(1, durationSec) / 1000;
  return Math.max(50, Math.floor(totalKbps - audioBitrateKbps));
}
