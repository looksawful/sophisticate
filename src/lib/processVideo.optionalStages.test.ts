import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Crop } from "./videoUtils";

const mockState = vi.hoisted(() => ({
  execCalls: [] as string[][],
}));

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class MockFFmpeg {
    loaded = false;

    async load() {
      this.loaded = true;
    }

    on() {}
    off() {}
    terminate() {}
    async writeFile() {}
    async deleteFile() {}

    async exec(args: string[]) {
      mockState.execCalls.push(args);
      return 0;
    }

    async readFile() {
      return new Uint8Array(100);
    }
  },
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn(async () => new Uint8Array([1])),
  toBlobURL: vi.fn(async (url: string) => url),
}));

import { processVideo } from "./processVideo";

const file = { name: "input.mp4", size: 1, type: "video/mp4" } as File;
const baseOptions = {
  format: "MP4" as const,
  videoWidth: 320,
  videoHeight: 240,
  duration: 1,
  includeAudio: false,
  onLog: () => {},
  onProgress: () => {},
};

describe("processVideo optional pipeline stages", () => {
  beforeEach(() => {
    mockState.execCalls.length = 0;
  });

  it("omits the crop filter entirely when crop is disabled", async () => {
    const blob = await processVideo(file, {
      ...baseOptions,
      crop: undefined as unknown as Crop,
      maxSizeMB: 1,
    });

    expect(blob.size).toBe(100);
    expect(mockState.execCalls).toHaveLength(1);
    const args = mockState.execCalls[0];
    expect(args).not.toContain("-vf");
    expect(args.some((arg) => arg.startsWith("crop="))).toBe(false);
  });

  it("omits size targeting and fallback passes when size limiting is disabled", async () => {
    const blob = await processVideo(file, {
      ...baseOptions,
      crop: { x: 0, y: 0, w: 1, h: 1 },
      maxSizeMB: undefined as unknown as number,
    });

    expect(blob.size).toBe(100);
    expect(mockState.execCalls).toHaveLength(1);
    const args = mockState.execCalls[0];
    expect(args).not.toContain("-maxrate");
    expect(args).not.toContain("-bufsize");
    expect(args.some((arg) => arg.includes("NaN"))).toBe(false);
  });
});
