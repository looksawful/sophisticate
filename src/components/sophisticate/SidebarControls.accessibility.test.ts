import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidebarControls } from "./SidebarControls";
import type { SophisticateController } from "./useSophisticateController";

const controller = {
  cropEnabled: false,
  sizeLimitEnabled: false,
  fileUrl: "blob:video",
  processing: false,
  activePreset: "Free",
  customW: "16",
  customH: "9",
  zoom: 1,
  zoomStep: 0.1,
  maxSize: "0.49",
  format: "MP4",
  quality: "medium",
  speed: 1,
  fps: 0,
} as unknown as SophisticateController;

describe("disabled settings keyboard semantics", () => {
  it("disables crop presets and size input when their stage is off", () => {
    const html = renderToStaticMarkup(createElement(SidebarControls, { c: controller }));
    const ratioButton = html.match(/<button[^>]*>1:1<\/button>/)?.[0];
    const sizeInput = html.match(/<input[^>]*aria-label="Maximum output file size in megabytes"[^>]*>/)?.[0];
    expect(ratioButton).toMatch(/ disabled=""/);
    expect(sizeInput).toMatch(/ disabled=""/);
    expect(html).toContain('aria-label="Video settings"');
    const customWidth = html.match(/<input[^>]*aria-label="Custom aspect ratio width"[^>]*>/)?.[0];
    expect(customWidth).toMatch(/ disabled=""/);
  });
  it("keeps the settings editable when their stage is enabled", () => {
    const enabled = { ...controller, cropEnabled: true, sizeLimitEnabled: true } as SophisticateController;
    const html = renderToStaticMarkup(createElement(SidebarControls, { c: enabled }));
    const ratioButton = html.match(/<button[^>]*>1:1<\/button>/)?.[0];
    const sizeInput = html.match(/<input[^>]*aria-label="Maximum output file size in megabytes"[^>]*>/)?.[0];
    const customWidth = html.match(/<input[^>]*aria-label="Custom aspect ratio width"[^>]*>/)?.[0];
    expect(ratioButton).not.toMatch(/ disabled=""/);
    expect(sizeInput).not.toMatch(/ disabled=""/);
    expect(customWidth).not.toMatch(/ disabled=""/);
  });
});
