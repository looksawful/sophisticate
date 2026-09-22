import { describe, expect, it } from "vitest";
import { getUnsupportedVideoMessage, isSupportedVideoFile } from "./mediaInput";

describe("isSupportedVideoFile", () => {
  it.each([
    { name: "clip.mp4", type: "video/mp4" },
    { name: "clip.bin", type: "video/webm" },
    { name: "clip.mov", type: "video/quicktime" },
  ])("accepts declared video MIME: $type", (file) => {
    expect(isSupportedVideoFile(file)).toBe(true);
  });

  it.each(["clip.mp4", "clip.m4v", "clip.mov", "clip.webm", "CLIP.MP4"])(
    "accepts explicit extension fallback when MIME is absent: %s",
    (name) => {
      expect(isSupportedVideoFile({ name, type: "" })).toBe(true);
    },
  );

  it.each([
    { name: "notes.txt", type: "" },
    { name: "clip.avi", type: "" },
    { name: "clip.mp4", type: "text/plain" },
    { name: "clip.webm", type: "application/octet-stream" },
  ])("rejects unsupported input %#", (file) => {
    expect(isSupportedVideoFile(file)).toBe(false);
  });

  it("returns one actionable message for every rejected intake path", () => {
    expect(getUnsupportedVideoMessage()).toMatch(/MP4|M4V|MOV|WEBM/i);
  });
});
