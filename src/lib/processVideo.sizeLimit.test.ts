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

describe("processVideo size-limit postcondition", () => {
  beforeEach(() => {
    mockState.execCalls.length = 0;
    // 0.001 MB = 1048.576 bytes. Both the CRF result and the fallback
    // remain above the configured limit.
    mockState.readSizes = [1200, 1100];
  });

  it("rejects when the final encoded output still exceeds the configured size limit", async () => {
    const file = { name: "input.mp4", size: 1, type: "video/mp4" } as File;

    await expect(
      processVideo(file, {
        crop: { x: 0, y: 0, w: 1, h: 1 },
        maxSizeMB: 0.001,
        format: "MP4",
        videoWidth: 320,
        videoHeight: 240,
        duration: 1,
        includeAudio: false,
        onLog: () => {},
        onProgress: () => {},
      }),
    ).rejects.toThrow(/output.*exceeds.*limit/i);
  });
});
