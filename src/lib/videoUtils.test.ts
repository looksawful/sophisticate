import { describe, expect, it } from "vitest";
import { clamp01, normalizeCrop, prettyBytes } from "./videoUtils";

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
