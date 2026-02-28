/**
 * Comprehensive tests for sophisticate config, ui tokens, and memoHelpers.
 */
import { describe, expect, it } from "vitest";
import { cropPixels, normalizeCrop } from "@/lib/videoUtils";
import {
  ASPECT_PRESETS,
  RATIO_PRESETS,
  SPECIAL_PRESETS,
  type AspectPreset,
  containerVariants,
  fadeVariants,
  hoverLift,
  riseVariants,
} from "./config";
import { controllerEqual } from "./memoHelpers";
import { ui } from "./ui";

/* ================================================================== */
/*  CONFIG — Aspect presets                                            */
/* ================================================================== */
describe("ASPECT_PRESETS — comprehensive", () => {
  it("all labels are unique", () => {
    const labels = ASPECT_PRESETS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every preset has a non-empty desc", () => {
    for (const p of ASPECT_PRESETS) {
      expect(p.desc.length).toBeGreaterThan(0);
    }
  });

  it("SPECIAL_PRESETS come first in ASPECT_PRESETS", () => {
    for (let i = 0; i < SPECIAL_PRESETS.length; i++) {
      expect(ASPECT_PRESETS[i]).toEqual(SPECIAL_PRESETS[i]);
    }
  });

  it("RATIO_PRESETS follow SPECIAL_PRESETS in ASPECT_PRESETS", () => {
    for (let i = 0; i < RATIO_PRESETS.length; i++) {
      expect(ASPECT_PRESETS[SPECIAL_PRESETS.length + i]).toEqual(RATIO_PRESETS[i]);
    }
  });

  it("Original has sentinel w=0, h=0", () => {
    const p = ASPECT_PRESETS.find((p) => p.label === "Original")!;
    expect(p.w).toBe(0);
    expect(p.h).toBe(0);
  });

  it("Free has sentinel w=-1, h=-1", () => {
    const p = ASPECT_PRESETS.find((p) => p.label === "Free")!;
    expect(p.w).toBe(-1);
    expect(p.h).toBe(-1);
  });

  it("all RATIO_PRESETS have positive w and h", () => {
    for (const p of RATIO_PRESETS) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });

  it("ratio labels match w:h pattern", () => {
    for (const p of RATIO_PRESETS) {
      expect(p.label).toMatch(/^\d+:\d+$/);
      const [w, h] = p.label.split(":").map(Number);
      expect(w).toBe(p.w);
      expect(h).toBe(p.h);
    }
  });

  it("common social presets are present", () => {
    const labels = ASPECT_PRESETS.map((p) => p.label);
    expect(labels).toContain("1:1"); // Instagram square
    expect(labels).toContain("16:9"); // YouTube/landscape
    expect(labels).toContain("9:16"); // TikTok/Reels/Shorts
    expect(labels).toContain("4:5"); // Instagram feed portrait
  });

  it("has both landscape and portrait variants", () => {
    const labels = new Set(ASPECT_PRESETS.map((p) => p.label));
    // 16:9 has 9:16 counterpart, 4:3 has 3:4, 21:9 has 9:21
    expect(labels.has("16:9") && labels.has("9:16")).toBe(true);
    expect(labels.has("4:3") && labels.has("3:4")).toBe(true);
    expect(labels.has("21:9") && labels.has("9:21")).toBe(true);
  });
});

/* ================================================================== */
/*  CONFIG — Animation variants                                        */
/* ================================================================== */
describe("animation variants", () => {
  it("containerVariants has initial and animate", () => {
    expect(containerVariants).toHaveProperty("initial");
    expect(containerVariants).toHaveProperty("animate");
  });

  it("riseVariants moves from y=18 to y=0", () => {
    expect(riseVariants.initial).toMatchObject({ y: 18 });
    expect(riseVariants.animate).toMatchObject({ y: 0 });
  });

  it("fadeVariants goes from opacity 0 to 1", () => {
    expect(fadeVariants.initial).toMatchObject({ opacity: 0 });
    expect(fadeVariants.animate).toMatchObject({ opacity: 1 });
  });

  it("hoverLift has whileHover and whileTap", () => {
    expect(hoverLift).toHaveProperty("whileHover");
    expect(hoverLift).toHaveProperty("whileTap");
  });
});

/* ================================================================== */
/*  UI TOKENS                                                          */
/* ================================================================== */
describe("ui tokens — comprehensive", () => {
  const allKeys = [
    "panel",
    "panelStrong",
    "sectionHeader",
    "label",
    "muted",
    "dim",
    "controlBase",
    "buttonGhost",
    "buttonPrimary",
    "buttonDanger",
    "chip",
    "chipActive",
  ] as const;

  for (const key of allKeys) {
    it(`ui.${key} is a non-empty string`, () => {
      expect(typeof (ui as Record<string, unknown>)[key]).toBe("string");
      expect(((ui as Record<string, string>)[key]).length).toBeGreaterThan(0);
    });
  }

  it("button tokens contain expected Tailwind color hints", () => {
    expect(ui.buttonPrimary).toContain("pink");
    expect(ui.buttonDanger).toContain("red");
  });

  it("chipActive contains pink-500", () => {
    expect(ui.chipActive).toContain("pink-500");
  });

  it("controlBase mentions rounded", () => {
    expect(ui.controlBase.toLowerCase()).toContain("rounded");
  });
});

/* ================================================================== */
/*  MEMO HELPERS                                                       */
/* ================================================================== */
describe("controllerEqual — comprehensive", () => {
  it("returns true for identical objects", () => {
    const obj = { a: 1, b: "hello", c: () => {} } as unknown as ReturnType<
      typeof import("./useSophisticateController").useSophisticateController
    >;
    expect(controllerEqual({ c: obj }, { c: obj })).toBe(true);
  });

  it("returns true when all properties are reference-equal", () => {
    const fn = () => {};
    const a = { x: 1, y: "hi", z: fn } as any;
    const b = { x: 1, y: "hi", z: fn } as any;
    expect(controllerEqual({ c: a }, { c: b })).toBe(true);
  });

  it("returns false when a property value differs", () => {
    const a = { x: 1, y: "hi" } as any;
    const b = { x: 1, y: "bye" } as any;
    expect(controllerEqual({ c: a }, { c: b })).toBe(false);
  });

  it("returns false when key count differs", () => {
    const a = { x: 1, y: 2 } as any;
    const b = { x: 1 } as any;
    expect(controllerEqual({ c: a }, { c: b })).toBe(false);
  });

  it("is sensitive to function identity (new fn !== old fn)", () => {
    const a = { handler: () => {} } as any;
    const b = { handler: () => {} } as any;
    expect(controllerEqual({ c: a }, { c: b })).toBe(false);
  });

  it("handles empty objects", () => {
    expect(controllerEqual({ c: {} as any }, { c: {} as any })).toBe(true);
  });
});

/* ================================================================== */
/*  Cross-module: crop preset → cropPixels integration                 */
/* ================================================================== */
describe("preset → crop → pixels integration", () => {
  // Simulate what applyPresetCrop does for ratio presets
  function applyPresetCrop(preset: AspectPreset, width: number, height: number) {
    if (preset.w === 0 || preset.h === 0 || width <= 0 || height <= 0) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
    const targetAspect = preset.w / preset.h;
    const videoAspect = width / height;
    let newW: number, newH: number;
    if (targetAspect > videoAspect) {
      newW = 1;
      newH = width / targetAspect / height;
    } else {
      newH = 1;
      newW = (height * targetAspect) / width;
    }
    newW = Math.min(1, newW);
    newH = Math.min(1, newH);
    return normalizeCrop({ x: (1 - newW) / 2, y: (1 - newH) / 2, w: newW, h: newH });
  }

  it("16:9 on 320x240 (4:3) video crops height", () => {
    const preset = RATIO_PRESETS.find((p) => p.label === "16:9")!;
    const crop = applyPresetCrop(preset, 320, 240);
    // 16:9 is wider than 4:3, so width stays 1, height is reduced
    expect(crop.w).toBe(1);
    expect(crop.h).toBeLessThan(1);
    const px = cropPixels(crop, 320, 240);
    // Aspect ratio of output should be close to 16:9
    const outputAspect = px.w / px.h;
    expect(outputAspect).toBeCloseTo(16 / 9, 1);
  });

  it("9:16 on 640x480 video crops width", () => {
    const preset = RATIO_PRESETS.find((p) => p.label === "9:16")!;
    const crop = applyPresetCrop(preset, 640, 480);
    expect(crop.h).toBe(1);
    expect(crop.w).toBeLessThan(1);
    const px = cropPixels(crop, 640, 480);
    const outputAspect = px.w / px.h;
    expect(outputAspect).toBeCloseTo(9 / 16, 1);
  });

  it("1:1 square on 1920x1080 crops width", () => {
    const preset = RATIO_PRESETS.find((p) => p.label === "1:1")!;
    const crop = applyPresetCrop(preset, 1920, 1080);
    const px = cropPixels(crop, 1920, 1080);
    expect(px.w).toBe(px.h);
  });

  it("Original preset returns identity crop", () => {
    const preset = SPECIAL_PRESETS.find((p) => p.label === "Original")!;
    const crop = applyPresetCrop(preset, 1920, 1080);
    expect(crop).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("all ratio presets produce valid pixel values on test video dims", () => {
    for (const preset of RATIO_PRESETS) {
      const crop = applyPresetCrop(preset, 320, 240);
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.w).toBeLessThanOrEqual(1.001);
      expect(crop.y + crop.h).toBeLessThanOrEqual(1.001);

      const px = cropPixels(crop, 320, 240);
      expect(px.w).toBeGreaterThanOrEqual(2);
      expect(px.h).toBeGreaterThanOrEqual(2);
      expect(px.w % 2).toBe(0);
      expect(px.h % 2).toBe(0);
      expect(px.x + px.w).toBeLessThanOrEqual(320);
      expect(px.y + px.h).toBeLessThanOrEqual(240);
    }
  });
});
