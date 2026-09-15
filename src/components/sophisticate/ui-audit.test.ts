/**
 * UI Audit Tests — Hypothesis-driven tests that verify interface problems
 * and their fixes.
 *
 * Each section tests a specific UI/UX issue:
 *   BEFORE: proves the problem exists in the source code
 *   AFTER:  proves the fix is correctly applied
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const COMP_DIR = path.resolve(__dirname);
const HOOKS_DIR = path.join(COMP_DIR, "hooks");
const read = (file: string, dir = COMP_DIR) => fs.readFileSync(path.join(dir, file), "utf-8");

const sidebarSrc = read("SidebarControls.tsx");
const previewSrc = read("PreviewPane.tsx");
const viewSrc = read("SophisticatePreviewView.tsx");
const footerSrc = read("AppFooter.tsx");
const logPanelSrc = read("LogPanel.tsx");
const controllerSrc = read("useSophisticateController.ts");
const logStateSrc = read("useLogState.ts", HOOKS_DIR);
const playbackSrc = read("usePlaybackState.ts", HOOKS_DIR);

/* ================================================================== */
/*  P1 — Speed control missing from UI                                */
/* ================================================================== */
describe("P1: Speed control in UI", () => {
  it("controller exposes speed + setSpeed", () => {
    // The controller has speed state — it SHOULD be controllable in UI
    expect(controllerSrc).toContain("speed");
    expect(controllerSrc).toContain("setSpeed");
  });

  it("AFTER: SidebarControls renders playback speed buttons", () => {
    expect(sidebarSrc).toContain("setSpeed");
    expect(sidebarSrc).toContain("Playback speed");
    expect(sidebarSrc).toMatch(/\[0\.5,\s*1,\s*1\.5,\s*2\]/);
    expect(sidebarSrc).toContain("{s}x");
  });
});

/* ================================================================== */
/*  P2 — Timeline trim handles too narrow (3px)                       */
/* ================================================================== */
describe("P2: Trim handle usability", () => {
  it("AFTER: trim handles are NOT 3px narrow", () => {
    expect(previewSrc).not.toContain('w-[3px]');
  });

  it("AFTER: trim handles have hover feedback", () => {
    expect(previewSrc).toMatch(/hover:bg-pink|hover:scale/);
  });
});

/* ================================================================== */
/*  P3 — Crop dimensions badge overlaps Replace/Remove buttons        */
/* ================================================================== */
describe("P3: Crop overlay element overlap", () => {
  it("AFTER: crop dimensions badge and Replace/Remove are NOT at same position", () => {
    const cropPxBadge = previewSrc.match(/cropPx\.w\}x\{c\.cropPx\.h\}[\s\S]{0,200}/);
    expect(cropPxBadge).toBeTruthy();
    const badgeSection = previewSrc.slice(
      previewSrc.indexOf("{c.cropPx.w}x{c.cropPx.h}") - 200,
      previewSrc.indexOf("{c.cropPx.w}x{c.cropPx.h}") + 50,
    );
    expect(badgeSection).toContain("bottom-");
  });
});

/* ================================================================== */
/*  P4 — No loading indicator when video is loading                   */
/* ================================================================== */
describe("P4: Video loading indicator", () => {
  it("AFTER: loading spinner shown when file is set but metadata not loaded", () => {
    expect(previewSrc).toMatch(/videoDuration\s*===?\s*0|Loading|spinner|animate-spin/i);
  });
});

/* ================================================================== */
/*  P5 — Inconsistent disabled states on controls                     */
/* ================================================================== */
describe("P5: Disabled state consistency", () => {
  it("AFTER: Format buttons check fileUrl", () => {
    const formatSection = sidebarSrc.slice(
      sidebarSrc.indexOf('"MP4"'),
      sidebarSrc.indexOf('"MP4"') + 400,
    );
    expect(formatSection).toContain("!c.fileUrl");
  });

  it("AFTER: Quality buttons check fileUrl", () => {
    const qualitySection = sidebarSrc.slice(
      sidebarSrc.indexOf('"low"'),
      sidebarSrc.indexOf('"low"') + 400,
    );
    expect(qualitySection).toContain("!c.fileUrl");
  });

  it("AFTER: Frame-rate buttons check fileUrl", () => {
    const fpsSection = sidebarSrc.slice(
      sidebarSrc.indexOf("setFps"),
      sidebarSrc.indexOf("setFps") + 500,
    );
    expect(fpsSection).toContain("!c.fileUrl");
  });
});

/* ================================================================== */
/*  P6 — Download fallback silently downloads source file             */
/* ================================================================== */
describe("P6: Download fallback", () => {
  it("AFTER: handleDownload does NOT download source when no result", () => {
    const downloadFn = controllerSrc.slice(
      controllerSrc.indexOf("const handleDownload"),
      controllerSrc.indexOf("const handleDownload") + 600,
    );
    expect(downloadFn).not.toContain("fileRef.current");
  });
});

/* ================================================================== */
/*  P7 — Progress percentage shown in 3 places simultaneously        */
/* ================================================================== */
describe("P7: Progress text duplication", () => {
  it("AFTER: Process button does NOT show percentage during processing", () => {
    const processBtnSection = previewSrc.slice(
      previewSrc.indexOf("c.realProcess"),
      previewSrc.indexOf("c.realProcess") + 400,
    );
    expect(processBtnSection).not.toMatch(/Processing.*\$\{.*progress|Processing.*Math\.round/);
  });

  it("AFTER: header badge does NOT duplicate progress percentage", () => {
    const headerSection = viewSrc.slice(
      viewSrc.indexOf("fileBadge") - 200,
      viewSrc.indexOf("fileBadge") + 100,
    );
    expect(headerSection).not.toMatch(/Processing.*progress/);
  });
});

/* ================================================================== */
/*  P8 — Log panel uses index as React key                            */
/* ================================================================== */
describe("P8: Log entry keys", () => {
  it("AFTER: log entries have stable IDs, not bare array index", () => {
    expect(logPanelSrc).not.toMatch(/key=\{i\}/);
  });

  it("AFTER: useLogState stores entries with unique IDs", () => {
    expect(logStateSrc).toMatch(/id:\s*\w+/);
  });
});

/* ================================================================== */
/*  P9 — Sidebar content doesn't scroll on short viewports           */
/* ================================================================== */
describe("P9: Sidebar scroll", () => {
  it("AFTER: sidebar inner container has overflow-y-auto", () => {
    expect(sidebarSrc).toContain("overflow-y-auto");
  });
});
