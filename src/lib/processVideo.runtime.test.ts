import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFFmpegRuntimeURLs } from "./processVideo";

const source = fs.readFileSync(path.resolve(__dirname, "processVideo.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};

describe("FFmpeg runtime ownership", () => {
  it("pins the FFmpeg core package used by the browser runtime", () => {
    expect(packageJson.dependencies?.["@ffmpeg/core"]).toBe("0.12.6");
  });

  it("does not load FFmpeg core from an external CDN at runtime", () => {
    expect(source).not.toContain("unpkg.com");
    expect(source).not.toContain("jsdelivr.net");
  });

  it("builds local core and class-worker URLs from the exported base path", () => {
    expect(buildFFmpegRuntimeURLs("/sophisticate/")).toEqual({
      coreURL: "/sophisticate/ffmpeg-core/ffmpeg-core.js",
      wasmURL: "/sophisticate/ffmpeg-core/ffmpeg-core.wasm",
      classWorkerURL: "/sophisticate/ffmpeg-worker/worker.js",
    });
  });

  it("keeps runtime URLs root-relative without a base path", () => {
    expect(buildFFmpegRuntimeURLs("")).toEqual({
      coreURL: "/ffmpeg-core/ffmpeg-core.js",
      wasmURL: "/ffmpeg-core/ffmpeg-core.wasm",
      classWorkerURL: "/ffmpeg-worker/worker.js",
    });
  });
});
