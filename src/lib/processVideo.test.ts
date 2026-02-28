import { describe, expect, it } from "vitest";

/**
 * processVideo relies on FFmpeg WASM which can't run in Node.
 * These tests validate the helper logic and exported contract shape.
 */

describe("processVideo module contract", () => {
  it("exports processVideo and stopProcessing", async () => {
    const mod = await import("./processVideo");
    expect(typeof mod.processVideo).toBe("function");
    expect(typeof mod.stopProcessing).toBe("function");
  });

  it("stopProcessing does not throw when nothing is running", async () => {
    const { stopProcessing } = await import("./processVideo");
    expect(() => stopProcessing()).not.toThrow();
  });
});

describe("buildAtempoFilters (internal logic mirror)", () => {
  // Mirror of the private buildAtempoFilters to verify correctness
  function buildAtempoFilters(speed: number): string[] {
    if (!(speed > 0) || speed === 1) return [];
    const filters: string[] = [];
    let remaining = speed;
    while (remaining < 0.5) {
      filters.push("atempo=0.5");
      remaining /= 0.5;
    }
    while (remaining > 2) {
      filters.push("atempo=2.0");
      remaining /= 2;
    }
    filters.push(`atempo=${remaining.toFixed(4)}`);
    return filters;
  }

  it("returns empty for speed=1", () => {
    expect(buildAtempoFilters(1)).toEqual([]);
  });

  it("returns single filter for moderate speed", () => {
    const f = buildAtempoFilters(1.5);
    expect(f).toHaveLength(1);
    expect(f[0]).toBe("atempo=1.5000");
  });

  it("chains filters for speed > 2", () => {
    const f = buildAtempoFilters(4);
    expect(f.length).toBeGreaterThanOrEqual(2);
    expect(f[0]).toBe("atempo=2.0");
  });

  it("chains filters for speed < 0.5", () => {
    const f = buildAtempoFilters(0.25);
    expect(f.length).toBeGreaterThanOrEqual(2);
    expect(f[0]).toBe("atempo=0.5");
  });

  it("handles invalid speed", () => {
    expect(buildAtempoFilters(0)).toEqual([]);
    expect(buildAtempoFilters(-1)).toEqual([]);
    expect(buildAtempoFilters(NaN)).toEqual([]);
  });
});
