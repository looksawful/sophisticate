import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  readSizes: [] as number[],
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
      const size = mockState.readSizes.shift() ?? 0;
      return new Uint8Array(size);
    }
  },
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn(async () => new Uint8Array([1])),
  toBlobURL: vi.fn(async (url: string) => url),
}));

import { processVideo } from "./processVideo";

const file = { name: "input.mp4", size: 1, type: "video/mp4" } as File;
const options = {
  crop: { x: 0, y: 0, w: 1, h: 1 },
  maxSizeMB: 0.001,
  format: "MP4" as const,
  videoWidth: 320,
  videoHeight: 240,
  duration: 1,
  includeAudio: false,
  onLog: () => {},
  onProgress: () => {},
};

describe("processVideo size-limit postcondition", () => {
  beforeEach(() => {
    mockState.execCalls.length = 0;
    mockState.readSizes.length = 0;
  });

  it("rejects when all bounded fallback attempts still exceed the configured size limit", async () => {
    // 0.001 MB = 1048.576 bytes. CRF and both fallback attempts remain too large.
    mockState.readSizes = [1200, 1100, 1080];

    await expect(processVideo(file, options)).rejects.toThrow(/output.*exceeds.*limit/i);
  });

  it("runs one additional adaptive fallback when the first fallback still overshoots", async () => {
    // CRF -> 1400, fallback #1 -> 1200 (still too large), fallback #2 -> 900 (within limit).
    mockState.readSizes = [1400, 1200, 900];

    const blob = await processVideo(file, options);

    expect(blob.size).toBe(900);
    expect(mockState.execCalls).toHaveLength(3);
  });
});
