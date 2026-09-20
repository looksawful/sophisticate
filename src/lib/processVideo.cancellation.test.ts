import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  loadResolve: null as null | (() => void),
  execResolve: null as null | ((code: number) => void),
  exec: vi.fn(),
  terminate: vi.fn(),
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn(async () => new Uint8Array([1])),
  toBlobURL: vi.fn(async (url: string) => url),
}));

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class {
    loaded = false;
    async load() {
      await new Promise<void>((resolve) => {
        state.loadResolve = () => {
          this.loaded = true;
          resolve();
        };
      });
    }
    on() {}
    off() {}
    async writeFile() {}
    async deleteFile() {}
    async readFile() { return new Uint8Array([1, 2, 3]); }
    exec(args: string[]) {
      state.exec(args);
      return new Promise<number>((resolve) => { state.execResolve = resolve; });
    }
    terminate() { state.terminate(); }
  },
}));

function options() {
  return {
    format: "MP4" as const,
    videoWidth: 320,
    videoHeight: 240,
    duration: 1,
    onLog: vi.fn(),
    onProgress: vi.fn(),
  };
}

describe("processing cancellation", () => {
  beforeEach(() => {
    vi.resetModules();
    state.loadResolve = null;
    state.execResolve = null;
    state.exec.mockReset();
    state.terminate.mockReset();
  });

  it("cancels a run while FFmpeg is still loading and never starts encode", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const run = processVideo(new File(["x"], "clip.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolve).toBeTypeOf("function"));
    stopProcessing();
    state.loadResolve?.();

    await expect(run).rejects.toThrow(/cancel/i);
    expect(state.exec).not.toHaveBeenCalled();
  });

  it("cancels an active encode and never publishes a successful result", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const run = processVideo(new File(["x"], "clip.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolve).toBeTypeOf("function"));
    state.loadResolve?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));

    stopProcessing();
    expect(state.terminate).toHaveBeenCalledTimes(1);
    state.execResolve?.(0);

    await expect(run).rejects.toThrow(/cancel/i);
  });

  it("can start a clean run after cancelling initialization", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const cancelled = processVideo(new File(["x"], "first.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolve).toBeTypeOf("function"));
    stopProcessing();
    state.loadResolve?.();
    await expect(cancelled).rejects.toThrow(/cancel/i);

    state.loadResolve = null;
    const retry = processVideo(new File(["x"], "retry.mp4"), options());
    await vi.waitFor(() => expect(state.loadResolve).toBeTypeOf("function"));
    state.loadResolve?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));
    state.execResolve?.(0);

    await expect(retry).resolves.toBeInstanceOf(Blob);
  });
});
