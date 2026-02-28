import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { type Crop, cropPixels, prettyBytes, targetBitrate } from "./videoUtils";

let ffmpegInstance: FFmpeg | null = null;
let runningFFmpeg: FFmpeg | null = null;

function buildAtempoFilters(speed: number): string[] {
  if (!(speed > 0) || speed === 1) return [];
  const filters: string[] = [];
  let remaining = speed;

  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  while (remaining > 2) {
    filters.push("atempo=2.0");
    remaining /= 2;
  }

  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters;
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  const ff = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegInstance = ff;
  return ff;
}

export interface ProcessOptions {
  crop: Crop;
  maxSizeMB: number;
  format: "MP4" | "WEBM";
  videoWidth: number;
  videoHeight: number;
  duration: number;
  onLog: (msg: string) => void;
  onProgress: (p: number) => void;
  trimStart?: number;
  trimEnd?: number;
  speed?: number;
  loop?: number;
  fps?: number;
  quality?: "low" | "medium" | "high";
  includeAudio?: boolean;
}

export function stopProcessing(): void {
  if (!runningFFmpeg) return;
  runningFFmpeg.terminate();
  runningFFmpeg = null;
  ffmpegInstance = null;
}

export async function processVideo(file: File, options: ProcessOptions): Promise<Blob> {
  const {
    crop,
    maxSizeMB,
    format,
    videoWidth,
    videoHeight,
    duration,
    onLog,
    onProgress,
    trimStart,
    trimEnd,
    speed = 1,
    loop = 1,
    fps,
    quality = "medium",
    includeAudio = true,
  } = options;

  onLog("[init] loading FFmpeg WASM core...");
  const ff = await getFFmpeg();
  runningFFmpeg = ff;
  onLog("[init] FFmpeg ready");
  onProgress(0.05);

  const logHandler = ({ message }: { message: string }) => onLog(`[ffmpeg] ${message}`);

  ff.on("log", logHandler);

  const ext = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".mp4";
  const inputName = `input${ext}`;
  const outputName = format === "WEBM" ? "output.webm" : "output.mp4";

  try {
    await ff.writeFile(inputName, await fetchFile(file));
    onLog(`[input] loaded ${prettyBytes(file.size)}`);
    onProgress(0.1);

    const px = cropPixels(crop, videoWidth, videoHeight);
    const cropFilter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    onLog(`[crop] ${cropFilter} (from ${videoWidth}x${videoHeight})`);

    const filters: string[] = [cropFilter];
    if (speed !== 1 && speed > 0) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    if (fps && fps > 0) {
      filters.push(`fps=${fps}`);
    }
    const vfArg = filters.join(",");

    const audioFilters: string[] = [];
    if (includeAudio && speed !== 1 && speed > 0) {
      audioFilters.push(...buildAtempoFilters(speed));
    }

    const inputArgs: string[] = [];
    if (trimStart !== undefined && trimStart > 0) {
      inputArgs.push("-ss", trimStart.toFixed(3));
    }
    inputArgs.push("-i", inputName);
    if (trimEnd !== undefined && trimEnd > 0 && trimEnd < duration) {
      const dur = trimEnd - (trimStart || 0);
      if (dur > 0) inputArgs.push("-t", dur.toFixed(3));
    }

    if (loop > 1) {
      inputArgs.splice(0, 0, "-stream_loop", String(loop - 1));
    }

    const trimmedDuration = (((trimEnd || duration) - (trimStart || 0)) * loop) / Math.max(0.25, speed);

    // WASM environment is CPU-constrained; always use ultrafast to keep
    // encoding time in seconds rather than minutes.  Visual quality at a
    // given bitrate is only ~5-10 % larger — an acceptable trade-off.
    const preset = "ultrafast";

    const aBitrate = includeAudio ? 128 : 0;

    const maxBytes = maxSizeMB * 1024 * 1024;

    // --- Quality-to-CRF mapping ---
    // CRF produces better quality-per-byte than ABR.  We encode once with
    // CRF + maxrate/bufsize as a soft ceiling.  If the result overshoots
    // the size limit we fall back to an explicit ABR pass.
    const crfMap = { low: 32, medium: 26, high: 20 } as const;
    const crfVpxMap = { low: 36, medium: 24, high: 14 } as const;

    // Compute a ceiling bitrate from the size budget so CRF doesn't
    // blow past the limit for long/complex sources.
    const overhead = 0.92;
    const ceilingBitrate = targetBitrate(maxSizeMB * overhead, trimmedDuration, aBitrate);

    onLog(`[encode] CRF pass — crf=${crfMap[quality]} ceiling=${ceilingBitrate}k audio=${aBitrate}k`);

    const pass1handler = ({ progress: p }: { progress: number }) => {
      onProgress(0.1 + Math.min(p, 1) * 0.45);
    };
    ff.on("progress", pass1handler);

    const baseArgs = [...inputArgs, "-vf", vfArg];
    if (includeAudio && audioFilters.length > 0) {
      baseArgs.push("-af", audioFilters.join(","));
    }

    if (format === "WEBM") {
      const args1 = [
        ...baseArgs,
        "-c:v",
        "libvpx",
        "-crf",
        String(crfVpxMap[quality]),
        "-b:v",
        `${ceilingBitrate}k`,
        ...(includeAudio ? ["-c:a", "libvorbis", "-b:a", `${aBitrate}k`] : ["-an"]),
        "-y",
        outputName,
      ];
      onLog(`[run] ffmpeg ${args1.join(" ")}`);
      const code1 = await ff.exec(args1);
      if (code1 !== 0) throw new Error(`FFmpeg CRF pass exited with code ${code1}`);
    } else {
      const args1 = [
        ...baseArgs,
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        String(crfMap[quality]),
        "-maxrate",
        `${ceilingBitrate}k`,
        "-bufsize",
        `${ceilingBitrate * 2}k`,
        ...(includeAudio ? ["-c:a", "aac", "-b:a", `${aBitrate}k`] : ["-an"]),
        "-movflags",
        "+faststart",
        "-y",
        outputName,
      ];
      onLog(`[run] ffmpeg ${args1.join(" ")}`);
      const code1 = await ff.exec(args1);
      if (code1 !== 0) throw new Error(`FFmpeg CRF pass exited with code ${code1}`);
    }

    ff.off("progress", pass1handler);
    onProgress(0.6);

    const data1 = (await ff.readFile(outputName)) as Uint8Array;
    const size1 = data1.byteLength;
    onLog(`[size] CRF result: ${prettyBytes(size1)} (limit: ${prettyBytes(maxBytes)})`);

    if (size1 > maxBytes && size1 > 0) {
      // CRF overshot — fall back to explicit ABR with a scaled bitrate.
      const ratio = maxBytes / size1;
      const safeRatio = Math.max(0.3, ratio * 0.95);
      const vBitrate2 = Math.max(50, Math.round(ceilingBitrate * safeRatio));
      onLog(`[encode] ABR fallback — video=${vBitrate2}k (ratio ${safeRatio.toFixed(2)})`);

      const pass2handler = ({ progress: p }: { progress: number }) => {
        onProgress(0.6 + Math.min(p, 1) * 0.3);
      };
      ff.on("progress", pass2handler);

      if (format === "WEBM") {
        const args2 = [
          ...baseArgs,
          "-c:v",
          "libvpx",
          "-b:v",
          `${vBitrate2}k`,
          ...(includeAudio ? ["-c:a", "libvorbis", "-b:a", `${aBitrate}k`] : ["-an"]),
          "-y",
          outputName,
        ];
        onLog(`[run] ffmpeg ${args2.join(" ")}`);
        const code2 = await ff.exec(args2);
        if (code2 !== 0) throw new Error(`FFmpeg pass 2 exited with code ${code2}`);
      } else {
        const args2 = [
          ...baseArgs,
          "-c:v",
          "libx264",
          "-preset",
          preset,
          "-b:v",
          `${vBitrate2}k`,
          "-maxrate",
          `${Math.round(vBitrate2 * 1.1)}k`,
          "-bufsize",
          `${vBitrate2 * 2}k`,
          ...(includeAudio ? ["-c:a", "aac", "-b:a", `${aBitrate}k`] : ["-an"]),
          "-movflags",
          "+faststart",
          "-y",
          outputName,
        ];
        onLog(`[run] ffmpeg ${args2.join(" ")}`);
        const code2 = await ff.exec(args2);
        if (code2 !== 0) throw new Error(`FFmpeg pass 2 exited with code ${code2}`);
      }

      ff.off("progress", pass2handler);
    }

    onProgress(0.92);

    const dataFinal = (await ff.readFile(outputName)) as Uint8Array;
    const mimeType = format === "WEBM" ? "video/webm" : "video/mp4";
    const blob = new Blob([dataFinal], { type: mimeType });
    onLog(`[done] output ${prettyBytes(blob.size)} / target ${prettyBytes(maxBytes)}`);

    onProgress(1);
    return blob;
  } finally {
    // Always clean up temp files and listeners, even on error / cancel
    try {
      await ff.deleteFile(inputName);
    } catch {}
    try {
      await ff.deleteFile(outputName);
    } catch {}
    ff.off("log", logHandler);
    if (runningFFmpeg === ff) {
      runningFFmpeg = null;
    }
  }
}
