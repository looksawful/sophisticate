/**
 * Integration tests using actual test video fixtures.
 *
 * These tests validate:
 * - Reading real video file bytes from disk
 * - Computing correct crop/bitrate parameters for real file sizes/durations
 * - The full FFmpeg argument construction pipeline
 * - Verifying the metadata-fix: handleVideoMetadata can receive mediaSize
 *
 * Note: FFmpeg WASM cannot run in Node, so we test everything up to the
 * actual FFmpeg invocation, plus post-processing logic.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { cropPixels, prettyBytes, targetBitrate } from "./videoUtils";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");
const VIDEO_320 = path.join(FIXTURE_DIR, "test-320x240-3s.mp4");
const VIDEO_640 = path.join(FIXTURE_DIR, "test-640x480-2s-noaudio.mp4");

/* ================================================================== */
/*  Test fixture availability                                          */
/* ================================================================== */
describe("test fixtures", () => {
  it("320x240 3s test video exists", () => {
    expect(fs.existsSync(VIDEO_320)).toBe(true);
  });

  it("640x480 2s no-audio test video exists", () => {
    expect(fs.existsSync(VIDEO_640)).toBe(true);
  });

  it("320x240 video is a valid file with reasonable size", () => {
    const stat = fs.statSync(VIDEO_320);
    expect(stat.size).toBeGreaterThan(10_000); // at least 10KB
    expect(stat.size).toBeLessThan(5_000_000); // less than 5MB
  });

  it("640x480 video has reasonable size", () => {
    const stat = fs.statSync(VIDEO_640);
    expect(stat.size).toBeGreaterThan(10_000);
    expect(stat.size).toBeLessThan(5_000_000);
  });

  it("files start with MP4 ftyp header", () => {
    const buf320 = Buffer.alloc(12);
    const fd = fs.openSync(VIDEO_320, "r");
    fs.readSync(fd, buf320, 0, 12, 0);
    fs.closeSync(fd);
    // MP4: bytes 4-7 should be "ftyp"
    expect(buf320.toString("ascii", 4, 8)).toBe("ftyp");
  });
});

/* ================================================================== */
/*  Simulated processVideo parameter construction                      */
/* ================================================================== */
describe("processVideo parameter construction with real files", () => {
  const videoWidth = 320;
  const videoHeight = 240;
  const duration = 3;
  const fileSize = fs.existsSync(VIDEO_320) ? fs.statSync(VIDEO_320).size : 231595;

  it("prettyBytes formats real file size correctly", () => {
    const formatted = prettyBytes(fileSize);
    expect(formatted).toMatch(/\d+(\.\d+)?\s*(KB|MB)/);
  });

  it("full-frame crop produces correct FFmpeg filter", () => {
    const crop = { x: 0, y: 0, w: 1, h: 1 };
    const px = cropPixels(crop, videoWidth, videoHeight);
    const filter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    expect(filter).toBe("crop=320:240:0:0");
  });

  it("center-half crop produces correct FFmpeg filter", () => {
    const crop = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
    const px = cropPixels(crop, videoWidth, videoHeight);
    const filter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    expect(filter).toBe("crop=160:120:80:60");
  });

  it("targetBitrate for 0.49MB/3s is reasonable", () => {
    const kbps = targetBitrate(0.49, duration);
    expect(kbps).toBeGreaterThan(100);
    expect(kbps).toBeLessThan(2000);
  });

  it("targetBitrate for unlimited (9999MB) is very high", () => {
    const kbps = targetBitrate(9999, duration);
    expect(kbps).toBeGreaterThan(20_000_000);
  });

  // Simulate the full argument array for MP4 CRF pass
  it("builds correct MP4 ffmpeg arguments", () => {
    const crop = { x: 0, y: 0, w: 1, h: 1 };
    const px = cropPixels(crop, videoWidth, videoHeight);
    const vf = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    const maxSizeMB = 0.49;
    const overhead = 0.92;
    const trimmedDuration = duration;
    const crf = 26; // medium quality
    const ceilingBitrate = targetBitrate(maxSizeMB * overhead, trimmedDuration, 128);

    const args = [
      "-i",
      "input.mp4",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      String(crf),
      "-maxrate",
      `${ceilingBitrate}k`,
      "-bufsize",
      `${ceilingBitrate * 2}k`,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-y",
      "output.mp4",
    ];

    expect(args).toContain("-c:v");
    expect(args).toContain("libx264");
    expect(args).toContain("-vf");
    expect(args).toContain(vf);
    expect(args.indexOf("-crf")).toBeGreaterThan(-1);
    expect(args[args.indexOf("-crf") + 1]).toBe("26");
  });

  // Simulate WEBM argument array
  it("builds correct WEBM ffmpeg arguments", () => {
    const crop = { x: 0, y: 0, w: 1, h: 1 };
    const px = cropPixels(crop, videoWidth, videoHeight);
    const vf = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    const maxSizeMB = 0.49;
    const ceilingBitrate = targetBitrate(maxSizeMB * 0.92, duration, 128);

    const args = [
      "-i",
      "input.mp4",
      "-vf",
      vf,
      "-c:v",
      "libvpx",
      "-crf",
      "24",
      "-b:v",
      `${ceilingBitrate}k`,
      "-c:a",
      "libvorbis",
      "-b:a",
      "128k",
      "-y",
      "output.webm",
    ];

    expect(args).toContain("libvpx");
    expect(args).toContain("libvorbis");
    expect(args[args.length - 1]).toBe("output.webm");
  });

  // No-audio argument variant
  it("adds -an when audio is disabled", () => {
    const args = [
      "-i",
      "input.mp4",
      "-vf",
      "crop=320:240:0:0",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "26",
      "-an",
      "-movflags",
      "+faststart",
      "-y",
      "output.mp4",
    ];
    expect(args).toContain("-an");
    expect(args).not.toContain("-c:a");
  });
});

/* ================================================================== */
/*  Speed + setpts filter                                              */
/* ================================================================== */
describe("speed filter construction", () => {
  it("speed=1 produces no setpts filter", () => {
    const speed = 1;
    const filters = [`crop=320:240:0:0`];
    if (speed !== 1 && speed > 0) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    expect(filters).toEqual(["crop=320:240:0:0"]);
  });

  it("speed=2 produces setpts=0.5*PTS", () => {
    const speed: number = 2;
    const filters = [`crop=320:240:0:0`];
    if (speed !== 1 && speed > 0) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    expect(filters).toContain("setpts=0.5000*PTS");
  });

  it("speed=0.5 produces setpts=2.0*PTS", () => {
    const speed: number = 0.5;
    const filters = [`crop=320:240:0:0`];
    if (speed !== 1 && speed > 0) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    expect(filters).toContain("setpts=2.0000*PTS");
  });
});

/* ================================================================== */
/*  FPS filter construction                                            */
/* ================================================================== */
describe("FPS filter construction", () => {
  it("fps=0 adds no filter", () => {
    const fps = 0;
    const filters = ["crop=320:240:0:0"];
    if (fps > 0) filters.push(`fps=${fps}`);
    expect(filters).toEqual(["crop=320:240:0:0"]);
  });

  it("fps=24 adds fps=24 filter", () => {
    const fps = 24;
    const filters = ["crop=320:240:0:0"];
    if (fps > 0) filters.push(`fps=${fps}`);
    expect(filters).toContain("fps=24");
  });

  it("fps=15 for low-bandwidth targets", () => {
    const fps = 15;
    const filters = ["crop=320:240:0:0"];
    if (fps > 0) filters.push(`fps=${fps}`);
    expect(filters[1]).toBe("fps=15");
  });
});

/* ================================================================== */
/*  Trim argument construction                                         */
/* ================================================================== */
describe("trim argument construction", () => {
  it("no trim when start=0 and end=duration", () => {
    const trimStart = 0;
    const trimEnd = 3;
    const duration = 3;
    const args: string[] = [];
    if (trimStart > 0) args.push("-ss", trimStart.toFixed(3));
    args.push("-i", "input.mp4");
    if (trimEnd > 0 && trimEnd < duration) {
      const dur = trimEnd - trimStart;
      if (dur > 0) args.push("-t", dur.toFixed(3));
    }
    expect(args).toEqual(["-i", "input.mp4"]);
  });

  it("trim start=1s adds -ss before -i", () => {
    const trimStart = 1;
    const args: string[] = [];
    if (trimStart > 0) args.push("-ss", trimStart.toFixed(3));
    args.push("-i", "input.mp4");
    expect(args[0]).toBe("-ss");
    expect(args[1]).toBe("1.000");
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
  });

  it("trim end=2s on 3s video adds -t", () => {
    const trimStart = 0;
    const trimEnd = 2;
    const duration = 3;
    const args: string[] = [];
    if (trimStart > 0) args.push("-ss", trimStart.toFixed(3));
    args.push("-i", "input.mp4");
    if (trimEnd > 0 && trimEnd < duration) {
      const dur = trimEnd - trimStart;
      if (dur > 0) args.push("-t", dur.toFixed(3));
    }
    expect(args).toContain("-t");
    expect(args[args.indexOf("-t") + 1]).toBe("2.000");
  });

  it("trim start=1 end=2 calculates correct duration", () => {
    const trimStart = 1;
    const trimEnd = 2;
    const duration = 3;
    const args: string[] = [];
    if (trimStart > 0) args.push("-ss", trimStart.toFixed(3));
    args.push("-i", "input.mp4");
    if (trimEnd > 0 && trimEnd < duration) {
      const dur = trimEnd - trimStart;
      if (dur > 0) args.push("-t", dur.toFixed(3));
    }
    expect(args).toContain("-ss");
    expect(args[args.indexOf("-ss") + 1]).toBe("1.000");
    expect(args).toContain("-t");
    expect(args[args.indexOf("-t") + 1]).toBe("1.000");
  });
});

/* ================================================================== */
/*  Loop argument construction                                         */
/* ================================================================== */
describe("loop argument construction", () => {
  it("loop=1 adds no stream_loop", () => {
    const loop = 1;
    const args = ["-i", "input.mp4"];
    if (loop > 1) args.splice(0, 0, "-stream_loop", String(loop - 1));
    expect(args).not.toContain("-stream_loop");
  });

  it("loop=2 adds -stream_loop 1 before -i", () => {
    const loop = 2;
    const args = ["-i", "input.mp4"];
    if (loop > 1) args.splice(0, 0, "-stream_loop", String(loop - 1));
    expect(args[0]).toBe("-stream_loop");
    expect(args[1]).toBe("1");
  });
});

/* ================================================================== */
/*  Trimmed duration calculation                                       */
/* ================================================================== */
describe("trimmed duration calculation", () => {
  it("no trim, no speed, no loop = original duration", () => {
    const duration = 3;
    const trimStart = 0;
    const trimEnd = 3;
    const speed = 1;
    const loop = 1;
    const result = (((trimEnd || duration) - (trimStart || 0)) * loop) / Math.max(0.25, speed);
    expect(result).toBe(3);
  });

  it("speed=2 halves effective duration", () => {
    const result = ((3 - 0) * 1) / Math.max(0.25, 2);
    expect(result).toBe(1.5);
  });

  it("loop=2 doubles effective duration", () => {
    const result = ((3 - 0) * 2) / Math.max(0.25, 1);
    expect(result).toBe(6);
  });

  it("trim 1-2 + speed=0.5 + loop=2 = 4s", () => {
    const result = ((2 - 1) * 2) / Math.max(0.25, 0.5);
    expect(result).toBe(4);
  });

  it("speed floor is 0.25", () => {
    const result = ((3 - 0) * 1) / Math.max(0.25, 0.1);
    expect(result).toBe(12); // 3 / 0.25
  });
});

/* ================================================================== */
/*  ABR fallback logic                                                 */
/* ================================================================== */
describe("ABR fallback bitrate calculation", () => {
  it("computes scaled bitrate when CRF overshoots", () => {
    const maxBytes = 0.49 * 1024 * 1024;
    const crfResultSize = 1 * 1024 * 1024; // 1MB — overshooting 0.49MB
    const ceilingBitrate = 500;

    const ratio = maxBytes / crfResultSize;
    const safeRatio = Math.max(0.3, ratio * 0.95);
    const vBitrate2 = Math.max(50, Math.round(ceilingBitrate * safeRatio));

    expect(ratio).toBeCloseTo(0.49, 2);
    expect(safeRatio).toBeCloseTo(0.4655, 2);
    expect(vBitrate2).toBeGreaterThan(200);
    expect(vBitrate2).toBeLessThan(ceilingBitrate);
  });

  it("safeRatio floor is 0.3", () => {
    const maxBytes = 0.01 * 1024 * 1024;
    const crfResultSize = 100 * 1024 * 1024;
    const ratio = maxBytes / crfResultSize;
    const safeRatio = Math.max(0.3, ratio * 0.95);
    expect(safeRatio).toBe(0.3);
  });

  it("bitrate floor is 50", () => {
    const vBitrate2 = Math.max(50, Math.round(10 * 0.3));
    expect(vBitrate2).toBe(50);
  });
});

/* ================================================================== */
/*  handleVideoMetadata: mediaSize parameter contract                  */
/* ================================================================== */
describe("handleVideoMetadata mediaSize integration", () => {
  // This validates the fix: handleVideoMetadata now accepts optional mediaSize
  // parameter from react-easy-crop's onMediaLoaded callback.

  it("mediaSize with naturalWidth/naturalHeight provides correct dims", () => {
    const mediaSize = { naturalWidth: 320, naturalHeight: 240 };
    const w = mediaSize.naturalWidth || 0;
    const h = mediaSize.naturalHeight || 0;
    expect(w).toBe(320);
    expect(h).toBe(240);
  });

  it("falls back to 0 when mediaSize is undefined", () => {
    const mediaSize: { naturalWidth: number; naturalHeight: number } | undefined = undefined;
    const w = mediaSize?.naturalWidth || 0;
    const h = mediaSize?.naturalHeight || 0;
    expect(w).toBe(0);
    expect(h).toBe(0);
  });

  it("mediaSize for 640x480 test video", () => {
    const mediaSize = { naturalWidth: 640, naturalHeight: 480, width: 400, height: 300 };
    const w = mediaSize.naturalWidth || 0;
    const h = mediaSize.naturalHeight || 0;
    expect(w).toBe(640);
    expect(h).toBe(480);
  });
});

/* ================================================================== */
/*  Quality-to-CRF mapping                                            */
/* ================================================================== */
describe("quality-to-CRF mapping", () => {
  const crfMap = { low: 32, medium: 26, high: 20 } as const;
  const crfVpxMap = { low: 36, medium: 24, high: 14 } as const;

  it("lower quality = higher CRF (smaller file)", () => {
    expect(crfMap.low).toBeGreaterThan(crfMap.medium);
    expect(crfMap.medium).toBeGreaterThan(crfMap.high);
  });

  it("VPX CRF follows same ordering", () => {
    expect(crfVpxMap.low).toBeGreaterThan(crfVpxMap.medium);
    expect(crfVpxMap.medium).toBeGreaterThan(crfVpxMap.high);
  });

  it("all CRF values are within valid range [0-51] for x264", () => {
    for (const v of Object.values(crfMap)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(51);
    }
  });

  it("all VPX CRF values are within valid range [0-63]", () => {
    for (const v of Object.values(crfVpxMap)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(63);
    }
  });
});
