import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

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

  it("loads the runtime from the exported project base path", () => {
    expect(source).toContain("NEXT_PUBLIC_BASE_PATH");
    expect(source).toContain("/ffmpeg-core");
  });
});
