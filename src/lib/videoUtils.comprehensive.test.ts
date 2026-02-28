/**
 * Comprehensive tests for videoUtils — covers every exported function
 * with wide input ranges including boundary values and degenerate inputs.
 */
import { describe, expect, it } from "vitest";
import { clamp01, cropPixels, normalizeCrop, prettyBytes, targetBitrate } from "./videoUtils";

/* ------------------------------------------------------------------ */
/*  clamp01                                                           */
/* ------------------------------------------------------------------ */
describe("clamp01 — comprehensive", () => {
  it.each([
    [-100, 0],
    [-0.001, 0],
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [1.001, 1],
    [999, 1],
  ])("clamp01(%f) === %f", (input, expected) => {
    expect(clamp01(input)).toBe(expected);
  });

  it("handles Infinity", () => {
    expect(clamp01(Infinity)).toBe(1);
    expect(clamp01(-Infinity)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeCrop                                                     */
/* ------------------------------------------------------------------ */
describe("normalizeCrop — comprehensive", () => {
  it("identity crop unchanged", () => {
    expect(normalizeCrop({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("center crop unchanged", () => {
    const crop = normalizeCrop({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
    expect(crop).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  });

  it("shifts position when crop overflows right/bottom", () => {
    const crop = normalizeCrop({ x: 0.8, y: 0.8, w: 0.5, h: 0.5 });
    expect(crop.x + crop.w).toBeLessThanOrEqual(1);
    expect(crop.y + crop.h).toBeLessThanOrEqual(1);
    expect(crop.w).toBe(0.5);
    expect(crop.h).toBe(0.5);
  });

  it("clamps width/height to [0,1]", () => {
    const crop = normalizeCrop({ x: 0, y: 0, w: 5, h: 5 });
    expect(crop.w).toBe(1);
    expect(crop.h).toBe(1);
  });

  it("clamps negative x/y to 0", () => {
    const crop = normalizeCrop({ x: -0.5, y: -0.3, w: 0.4, h: 0.4 });
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
  });

  it("tiny crop stays valid", () => {
    const crop = normalizeCrop({ x: 0.5, y: 0.5, w: 0.01, h: 0.01 });
    expect(crop.x + crop.w).toBeLessThanOrEqual(1);
    expect(crop.y + crop.h).toBeLessThanOrEqual(1);
    expect(crop.w).toBe(0.01);
    expect(crop.h).toBe(0.01);
  });

  it("zero-size crop", () => {
    const crop = normalizeCrop({ x: 0.5, y: 0.5, w: 0, h: 0 });
    expect(crop.w).toBe(0);
    expect(crop.h).toBe(0);
  });

  it("full-width, partial height", () => {
    const crop = normalizeCrop({ x: 0, y: 0.2, w: 1, h: 0.6 });
    expect(crop).toEqual({ x: 0, y: 0.2, w: 1, h: 0.6 });
  });
});

/* ------------------------------------------------------------------ */
/*  prettyBytes                                                       */
/* ------------------------------------------------------------------ */
describe("prettyBytes — comprehensive", () => {
  it.each([
    [0, "N/A"],
    [-1, "N/A"],
    [NaN, "N/A"],
    [Infinity, "N/A"],
    [-Infinity, "N/A"],
  ])("prettyBytes(%s) returns N/A for invalid values", (input, expected) => {
    expect(prettyBytes(input)).toBe(expected);
  });

  it.each([
    [1, "1 B"],
    [512, "512 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [1048576, "1.00 MB"],
    [1073741824, "1.00 GB"],
    [2.5 * 1024 * 1024, "2.50 MB"],
  ])("prettyBytes(%d) === %s", (input, expected) => {
    expect(prettyBytes(input)).toBe(expected);
  });
});

/* ------------------------------------------------------------------ */
/*  cropPixels                                                        */
/* ------------------------------------------------------------------ */
describe("cropPixels — comprehensive", () => {
  it("full-frame 1920x1080", () => {
    const px = cropPixels({ x: 0, y: 0, w: 1, h: 1 }, 1920, 1080);
    expect(px).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it("center quarter 1920x1080", () => {
    const px = cropPixels({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 1920, 1080);
    expect(px).toEqual({ x: 480, y: 270, w: 960, h: 540 });
  });

  it("returns even dimensions always", () => {
    for (const res of [101, 103, 201, 333, 719, 1081]) {
      const px = cropPixels({ x: 0, y: 0, w: 1, h: 1 }, res, res);
      expect(px.w % 2).toBe(0);
      expect(px.h % 2).toBe(0);
    }
  });

  it("minimum dimension is 2", () => {
    const px = cropPixels({ x: 0, y: 0, w: 0.001, h: 0.001 }, 100, 100);
    expect(px.w).toBeGreaterThanOrEqual(2);
    expect(px.h).toBeGreaterThanOrEqual(2);
  });

  it("320x240 test video — expected dimensions", () => {
    const px = cropPixels({ x: 0, y: 0, w: 1, h: 1 }, 320, 240);
    expect(px).toEqual({ x: 0, y: 0, w: 320, h: 240 });
  });

  it("640x480 test video — center 50% crop", () => {
    const px = cropPixels({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 640, 480);
    expect(px).toEqual({ x: 160, y: 120, w: 320, h: 240 });
  });

  it("small crop on high-res", () => {
    const px = cropPixels({ x: 0.1, y: 0.1, w: 0.1, h: 0.1 }, 3840, 2160);
    expect(px.w).toBe(384);
    expect(px.h).toBe(216);
    expect(px.w % 2).toBe(0);
    expect(px.h % 2).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  targetBitrate                                                     */
/* ------------------------------------------------------------------ */
describe("targetBitrate — comprehensive", () => {
  it("1MB/10s = reasonable bitrate", () => {
    const kbps = targetBitrate(1, 10);
    // 1MB = 8388608 bits / 10s / 1000 = 838.86 - 128 = ~710
    expect(kbps).toBeGreaterThan(600);
    expect(kbps).toBeLessThan(800);
  });

  it("minimum floor is 50", () => {
    expect(targetBitrate(0.001, 1000)).toBe(50);
  });

  it("very short duration yields high bitrate", () => {
    const kbps = targetBitrate(1, 0.5);
    expect(kbps).toBeGreaterThan(5000);
  });

  it("scales linearly with size", () => {
    const a = targetBitrate(1, 10);
    const b = targetBitrate(3, 10);
    // approximately 3x minus audio overhead
    expect(b).toBeGreaterThan(a * 2.5);
  });

  it("no audio overhead when 0", () => {
    const a = targetBitrate(1, 10, 0);
    const b = targetBitrate(1, 10, 128);
    expect(a).toBeGreaterThan(b);
    expect(a - b).toBeCloseTo(128, -1);
  });

  it("0 duration uses 1 as floor", () => {
    const kbps = targetBitrate(1, 0);
    expect(kbps).toBeGreaterThan(0);
  });

  it("negative duration uses 1 as floor", () => {
    const kbps = targetBitrate(1, -5);
    expect(kbps).toBeGreaterThan(0);
  });

  // Practical test-video scenario
  it("0.49MB limit for 3s video", () => {
    const kbps = targetBitrate(0.49, 3);
    expect(kbps).toBeGreaterThan(100);
    expect(kbps).toBeLessThan(2000);
  });
});
