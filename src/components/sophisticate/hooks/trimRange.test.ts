import { describe, expect, it } from "vitest";

import { normalizeTrimRange } from "./trimRange";

describe("normalizeTrimRange", () => {
  it("keeps an end-edge range inside duration", () => {
    expect(normalizeTrimRange(10, 10, 10)).toEqual({ start: 9.9, end: 10 });
  });

  it("uses the whole clip when the duration is shorter than the nominal gap", () => {
    expect(normalizeTrimRange(0.05, 0.05, 0.05)).toEqual({ start: 0, end: 0.05 });
  });

  it("resolves crossed handles predictably around the requested start", () => {
    expect(normalizeTrimRange(8, 2, 10)).toEqual({ start: 8, end: 8.1 });
  });

  it("returns a deterministic zero range for zero or invalid duration", () => {
    expect(normalizeTrimRange(1, 2, 0)).toEqual({ start: 0, end: 0 });
    expect(normalizeTrimRange(1, 2, Number.NaN)).toEqual({ start: 0, end: 0 });
    expect(normalizeTrimRange(1, 2, Number.POSITIVE_INFINITY)).toEqual({ start: 0, end: 0 });
  });

  it("normalizes non-finite boundaries without producing NaN", () => {
    expect(normalizeTrimRange(Number.NaN, Number.POSITIVE_INFINITY, 10)).toEqual({ start: 0, end: 10 });
  });
});
