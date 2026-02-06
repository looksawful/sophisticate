import { describe, expect, it } from "vitest";
import { clamp01, cropPixels, normalizeCrop, prettyBytes, targetBitrate } from "./videoUtils";

describe("clamp01", () => {
  it("clamps below zero", () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it("clamps above one", () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("keeps values in range", () => {
    expect(clamp01(0.25)).toBe(0.25);
  });
});

describe("normalizeCrop", () => {
  it("keeps crop within bounds", () => {
    const crop = normalizeCrop({ x: 0.9, y: 0.9, w: 0.3, h: 0.3 });
    expect(crop.x + crop.w).toBeLessThanOrEqual(1);
    expect(crop.y + crop.h).toBeLessThanOrEqual(1);
  });

  it("clamps negative positions and oversized dimensions", () => {
    const crop = normalizeCrop({ x: -1, y: -1, w: 2, h: 2 });
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.w).toBeLessThanOrEqual(1);
    expect(crop.h).toBeLessThanOrEqual(1);
  });
});

describe("prettyBytes", () => {
  it("handles invalid or empty values", () => {
    expect(prettyBytes(0)).toBe("N/A");
    expect(prettyBytes(-1)).toBe("N/A");
    expect(prettyBytes(Number.NaN)).toBe("N/A");
  });

  it("formats bytes", () => {
    expect(prettyBytes(512)).toBe("512 B");
    expect(prettyBytes(1024)).toBe("1.0 KB");
    expect(prettyBytes(1024 * 1024)).toBe("1.00 MB");
  });
});

describe("cropPixels", () => {
  it("converts normalized crop to pixel values", () => {
    const px = cropPixels({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 1920, 1080);
    expect(px.x).toBe(480);
    expect(px.y).toBe(270);
    expect(px.w).toBe(960);
    expect(px.h).toBe(540);
  });

  it("ensures even dimensions", () => {
    const px = cropPixels({ x: 0, y: 0, w: 0.501, h: 0.501 }, 101, 101);
    expect(px.w % 2).toBe(0);
    expect(px.h % 2).toBe(0);
  });

  it("ensures minimum dimension of 2", () => {
    const px = cropPixels({ x: 0, y: 0, w: 0.005, h: 0.005 }, 100, 100);
    expect(px.w).toBeGreaterThanOrEqual(2);
    expect(px.h).toBeGreaterThanOrEqual(2);
  });
});

describe("targetBitrate", () => {
  it("computes bitrate from size and duration", () => {
    const kbps = targetBitrate(1, 10);
    expect(kbps).toBeGreaterThan(500);
    expect(kbps).toBeLessThan(1000);
  });

  it("returns at least 50", () => {
    expect(targetBitrate(0.001, 100)).toBe(50);
  });

  it("uses custom audio bitrate", () => {
    const a = targetBitrate(1, 10, 64);
    const b = targetBitrate(1, 10, 256);
    expect(a).toBeGreaterThan(b);
  });
});
