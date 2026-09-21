import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  loadResolvers: [] as Array<() => void>,
  execResolvers: [] as Array<(code: number) => void>,
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
        state.loadResolvers.push(() => {
          this.loaded = true;
          resolve();
        });
      });
    }
    on() {}
    off() {}
    async writeFile() {}
    async deleteFile() {}
    async readFile() { return new Uint8Array([1, 2, 3]); }
    exec(args: string[]) {
      state.exec(args);
      return new Promise<number>((resolve) => {
        state.execResolvers.push(resolve);
      });
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
    state.loadResolvers.length = 0;
    state.execResolvers.length = 0;
    state.exec.mockReset();
    state.terminate.mockReset();
  });

  it("cancels a run while FFmpeg is still loading and never starts encode", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const run = processVideo(new File(["x"], "clip.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));
    stopProcessing();
    state.loadResolvers.shift()?.();

    await expect(run).rejects.toThrow(/cancel/i);
    expect(state.exec).not.toHaveBeenCalled();
  });

  it("cancels an active encode and never publishes a successful result", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const run = processVideo(new File(["x"], "clip.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));
    state.loadResolvers.shift()?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));

    stopProcessing();
    expect(state.terminate).toHaveBeenCalledTimes(1);
    state.execResolvers.shift()?.(0);

    await expect(run).rejects.toThrow(/cancel/i);
  });

  it("stops during a fallback pass and does not start another pass", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const run = processVideo(new File(["x"], "clip.mp4"), {
      ...options(),
      includeAudio: false,
      maxSizeMB: 0.000001,
    });

    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));
    state.loadResolvers.shift()?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));

    state.execResolvers.shift()?.(0);
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(2));

    stopProcessing();
    expect(state.terminate).toHaveBeenCalledTimes(1);
    state.execResolvers.shift()?.(0);

    await expect(run).rejects.toThrow(/cancel/i);
    expect(state.exec).toHaveBeenCalledTimes(2);
  });

  it("keeps a cancelled loading run from publishing over a newer run", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const firstOptions = options();
    const secondOptions = options();

    const first = processVideo(new File(["x"], "first.mp4"), firstOptions);
    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));

    stopProcessing();
    const second = processVideo(new File(["x"], "second.mp4"), secondOptions);
    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(2));

    const firstLoad = state.loadResolvers.shift();
    const secondLoad = state.loadResolvers.shift();

    secondLoad?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));

    const firstLogCount = firstOptions.onLog.mock.calls.length;
    const firstProgressCount = firstOptions.onProgress.mock.calls.length;

    firstLoad?.();
    await expect(first).rejects.toThrow(/cancel/i);

    expect(firstOptions.onLog).toHaveBeenCalledTimes(firstLogCount);
    expect(firstOptions.onProgress).toHaveBeenCalledTimes(firstProgressCount);

    state.execResolvers.shift()?.(0);
    await expect(second).resolves.toBeInstanceOf(Blob);
    expect(secondOptions.onProgress).toHaveBeenLastCalledWith(1);
  });

  it("can start a clean run after cancelling initialization", async () => {
    const { processVideo, stopProcessing } = await import("./processVideo");
    const cancelled = processVideo(new File(["x"], "first.mp4"), options());

    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));
    stopProcessing();
    state.loadResolvers.shift()?.();
    await expect(cancelled).rejects.toThrow(/cancel/i);

    const retry = processVideo(new File(["x"], "retry.mp4"), options());
    await vi.waitFor(() => expect(state.loadResolvers).toHaveLength(1));
    state.loadResolvers.shift()?.();
    await vi.waitFor(() => expect(state.exec).toHaveBeenCalledTimes(1));
    state.execResolvers.shift()?.(0);

    await expect(retry).resolves.toBeInstanceOf(Blob);
  });
});
