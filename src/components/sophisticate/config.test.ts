import { describe, expect, it } from "vitest";
import { ASPECT_PRESETS, RATIO_PRESETS, SPECIAL_PRESETS } from "./config";

describe("config constants", () => {
  it("SPECIAL_PRESETS contains Original and Free", () => {
    const labels = SPECIAL_PRESETS.map((p) => p.label);
    expect(labels).toContain("Original");
    expect(labels).toContain("Free");
  });

  it("RATIO_PRESETS has valid aspect ratios", () => {
    for (const preset of RATIO_PRESETS) {
      expect(preset.w).toBeGreaterThan(0);
      expect(preset.h).toBeGreaterThan(0);
      expect(preset.label).toMatch(/^\d+:\d+$/);
      expect(preset.desc.length).toBeGreaterThan(0);
    }
  });

  it("ASPECT_PRESETS is SPECIAL + RATIO combined", () => {
    expect(ASPECT_PRESETS.length).toBe(SPECIAL_PRESETS.length + RATIO_PRESETS.length);
    expect(ASPECT_PRESETS[0]).toEqual(SPECIAL_PRESETS[0]);
    expect(ASPECT_PRESETS[SPECIAL_PRESETS.length]).toEqual(RATIO_PRESETS[0]);
  });

  it("all presets have unique labels", () => {
    const labels = ASPECT_PRESETS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("Original preset has w=0, h=0", () => {
    const original = ASPECT_PRESETS.find((p) => p.label === "Original");
    expect(original).toBeDefined();
    expect(original!.w).toBe(0);
    expect(original!.h).toBe(0);
  });

  it("Free preset has w=-1, h=-1", () => {
    const free = ASPECT_PRESETS.find((p) => p.label === "Free");
    expect(free).toBeDefined();
    expect(free!.w).toBe(-1);
    expect(free!.h).toBe(-1);
  });
});

describe("animation variants (smoke)", () => {
  it("containerVariants exists with initial and animate", async () => {
    const { containerVariants } = await import("./config");
    expect(containerVariants).toHaveProperty("initial");
    expect(containerVariants).toHaveProperty("animate");
  });

  it("riseVariants exists with initial and animate", async () => {
    const { riseVariants } = await import("./config");
    expect(riseVariants).toHaveProperty("initial");
    expect(riseVariants).toHaveProperty("animate");
  });

  it("fadeVariants exists with initial and animate", async () => {
    const { fadeVariants } = await import("./config");
    expect(fadeVariants).toHaveProperty("initial");
    expect(fadeVariants).toHaveProperty("animate");
  });
});
