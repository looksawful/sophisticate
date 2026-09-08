import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  offEvents: [] as string[],
}));

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class MockFFmpeg {
    loaded = false;

    async load() {
      this.loaded = true;
    }

    on() {}

    off(event: string) {
      mockState.offEvents.push(event);
    }

    terminate() {}
    async writeFile() {}
    async deleteFile() {}

    async exec() {
      return 1;
    }

    async readFile() {
      return new Uint8Array(0);
    }
  },
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn(async () => new Uint8Array([1])),
  toBlobURL: vi.fn(async (url: string) => url),
}));

import { processVideo } from "./processVideo";

const file = { name: "input.mp4", size: 1, type: "video/mp4" } as File;

describe("processVideo listener cleanup", () => {
  it("removes the first-pass progress listener when FFmpeg exec fails", async () => {
    mockState.offEvents.length = 0;

    await expect(
      processVideo(file, {
        crop: { x: 0, y: 0, w: 1, h: 1 },
        maxSizeMB: 1,
        format: "MP4",
        videoWidth: 320,
        videoHeight: 240,
        duration: 1,
        includeAudio: false,
        onLog: () => {},
        onProgress: () => {},
      }),
    ).rejects.toThrow(/CRF pass exited with code 1/i);

    expect(mockState.offEvents).toContain("progress");
  });
});
