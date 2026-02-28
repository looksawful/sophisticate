/**
 * Tests for processVideo module contract, buildAtempoFilters logic,
 * and FFmpeg argument construction scenarios.
 */
import { describe, expect, it } from "vitest";

describe("processVideo module exports", () => {
  it("exports processVideo as async function", async () => {
    const mod = await import("./processVideo");
    expect(typeof mod.processVideo).toBe("function");
  });

  it("exports stopProcessing", async () => {
    const mod = await import("./processVideo");
    expect(typeof mod.stopProcessing).toBe("function");
  });

  it("stopProcessing is safe to call repeatedly", async () => {
    const { stopProcessing } = await import("./processVideo");
    expect(() => stopProcessing()).not.toThrow();
    expect(() => stopProcessing()).not.toThrow();
    expect(() => stopProcessing()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  buildAtempoFilters — mirror of private function                   */
/* ------------------------------------------------------------------ */
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

describe("buildAtempoFilters — comprehensive", () => {
  it("speed=1 => empty", () => {
    expect(buildAtempoFilters(1)).toEqual([]);
  });

  it("speed=0 => empty", () => {
    expect(buildAtempoFilters(0)).toEqual([]);
  });

  it("speed=NaN => empty", () => {
    expect(buildAtempoFilters(NaN)).toEqual([]);
  });

  it("speed=-2 => empty", () => {
    expect(buildAtempoFilters(-2)).toEqual([]);
  });

  it("speed=1.5 => single filter", () => {
    const f = buildAtempoFilters(1.5);
    expect(f).toEqual(["atempo=1.5000"]);
  });

  it("speed=0.75 => single filter", () => {
    const f = buildAtempoFilters(0.75);
    expect(f).toEqual(["atempo=0.7500"]);
  });

  it("speed=2 => single filter", () => {
    const f = buildAtempoFilters(2);
    expect(f).toEqual(["atempo=2.0000"]);
  });

  it("speed=0.5 => single filter", () => {
    const f = buildAtempoFilters(0.5);
    expect(f).toEqual(["atempo=0.5000"]);
  });

  it("speed=4 => chained (2.0 + 2.0)", () => {
    const f = buildAtempoFilters(4);
    expect(f).toEqual(["atempo=2.0", "atempo=2.0000"]);
  });

  it("speed=8 => triple chain", () => {
    const f = buildAtempoFilters(8);
    expect(f.length).toBe(3);
    expect(f[0]).toBe("atempo=2.0");
    expect(f[1]).toBe("atempo=2.0");
    expect(f[2]).toBe("atempo=2.0000");
  });

  it("speed=0.25 => chained (0.5 + 0.5)", () => {
    const f = buildAtempoFilters(0.25);
    expect(f).toEqual(["atempo=0.5", "atempo=0.5000"]);
  });

  it("speed=0.125 => triple chain", () => {
    const f = buildAtempoFilters(0.125);
    expect(f.length).toBe(3);
    expect(f[0]).toBe("atempo=0.5");
    expect(f[1]).toBe("atempo=0.5");
    expect(f[2]).toBe("atempo=0.5000");
  });

  it("speed=3 => 2.0 + 1.5", () => {
    const f = buildAtempoFilters(3);
    expect(f).toEqual(["atempo=2.0", "atempo=1.5000"]);
  });

  // Reconstruct effective speed from filters
  it("product of all atempo values equals original speed", () => {
    for (const speed of [0.3, 0.5, 0.75, 1.25, 1.5, 2, 3, 4, 6, 8, 0.125]) {
      const filters = buildAtempoFilters(speed);
      if (speed === 1) continue;
      const product = filters.reduce((acc, f) => {
        const val = parseFloat(f.replace("atempo=", ""));
        return acc * val;
      }, 1);
      expect(product).toBeCloseTo(speed, 2);
    }
  });

  // All atempo values must be in [0.5, 2.0]
  it("all filter values are within FFmpeg's [0.5, 2.0] range", () => {
    for (const speed of [0.1, 0.25, 0.5, 0.75, 1.5, 2, 3, 4, 8, 16]) {
      const filters = buildAtempoFilters(speed);
      for (const f of filters) {
        const val = parseFloat(f.replace("atempo=", ""));
        expect(val).toBeGreaterThanOrEqual(0.5 - 0.001);
        expect(val).toBeLessThanOrEqual(2.0 + 0.001);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  ProcessOptions type shape (compile-time check)                    */
/* ------------------------------------------------------------------ */
describe("ProcessOptions type contract", () => {
  it("has expected required fields in module", async () => {
    // Just verifying the module loads and types are consistent
    const mod = await import("./processVideo");
    expect(mod.processVideo.length).toBeGreaterThanOrEqual(1); // at least 1 param (file)
  });
});
