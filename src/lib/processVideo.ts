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
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const baseURL = `${basePath}/ffmpeg-core`;
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegInstance = ff;
  return ff;
}

export interface ProcessOptions {
  crop?: Crop;
  maxSizeMB?: number;
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

    const filters: string[] = [];
    if (crop) {
      const px = cropPixels(crop, videoWidth, videoHeight);
      const cropFilter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
      filters.push(cropFilter);
      onLog(`[crop] ${cropFilter} (from ${videoWidth}x${videoHeight})`);
    } else {
      onLog("[crop] disabled");
    }

    if (speed !== 1 && speed > 0) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }
    if (fps && fps > 0) {
      filters.push(`fps=${fps}`);
    }

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
    const preset = "ultrafast";
    const aBitrate = includeAudio ? 128 : 0;
    const hasSizeLimit = maxSizeMB !== undefined && Number.isFinite(maxSizeMB) && maxSizeMB > 0;
    const maxBytes = hasSizeLimit ? maxSizeMB * 1024 * 1024 : null;

    const crfMap = { low: 32, medium: 26, high: 20 } as const;
    const crfVpxMap = { low: 36, medium: 24, high: 14 } as const;
    const overhead = 0.92;
    const ceilingBitrate = hasSizeLimit ? targetBitrate(maxSizeMB * overhead, trimmedDuration, aBitrate) : null;

    if (ceilingBitrate !== null) {
      onLog(`[encode] CRF pass — crf=${crfMap[quality]} ceiling=${ceilingBitrate}k audio=${aBitrate}k`);
    } else {
      onLog(`[encode] CRF pass — crf=${crfMap[quality]} size limit=disabled audio=${aBitrate}k`);
    }

    const pass1handler = ({ progress: p }: { progress: number }) => {
      onProgress(0.1 + Math.min(p, 1) * 0.45);
    };
    ff.on("progress", pass1handler);

    const baseArgs = [...inputArgs];
    if (filters.length > 0) {
      baseArgs.push("-vf", filters.join(","));
    }
    if (includeAudio && audioFilters.length > 0) {
      baseArgs.push("-af", audioFilters.join(","));
    }

    try {
      if (format === "WEBM") {
        const args1 = [
          ...baseArgs,
          "-c:v",
          "libvpx",
          "-crf",
          String(crfVpxMap[quality]),
          "-b:v",
          ceilingBitrate !== null ? `${ceilingBitrate}k` : "0",
          ...(includeAudio ? ["-c:a", "libvorbis", "-b:a", `${aBitrate}k`] : ["-an"]),
          "-y",
          outputName,
        ];
        onLog(`[run] ffmpeg ${args1.join(" ")}`);
        const code1 = await ff.exec(args1);
        if (code1 !== 0) throw new Error(`FFmpeg CRF pass exited with code ${code1}`);
      } else {
        const sizeArgs =
          ceilingBitrate !== null
            ? ["-maxrate", `${ceilingBitrate}k`, "-bufsize", `${ceilingBitrate * 2}k`]
            : [];
        const args1 = [
          ...baseArgs,
          "-c:v",
          "libx264",
          "-preset",
          preset,
          "-crf",
          String(crfMap[quality]),
          ...sizeArgs,
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
    } finally {
      ff.off("progress", pass1handler);
    }

    onProgress(0.6);

    let finalData = (await ff.readFile(outputName)) as Uint8Array;
    let finalSize = finalData.byteLength;
    if (maxBytes !== null) {
      onLog(`[size] CRF result: ${prettyBytes(finalSize)} (limit: ${prettyBytes(maxBytes)})`);
    } else {
      onLog(`[size] CRF result: ${prettyBytes(finalSize)} (limit disabled)`);
    }

    const maxFallbackAttempts = 2;
    let currentBitrate = ceilingBitrate;

    if (maxBytes !== null && currentBitrate !== null) {
      for (let attempt = 1; attempt <= maxFallbackAttempts && finalSize > maxBytes && finalSize > 0; attempt++) {
        const ratio = maxBytes / finalSize;
        const safeRatio = Math.max(0.3, ratio * 0.95);
        currentBitrate = Math.max(50, Math.round(currentBitrate * safeRatio));
        onLog(
          `[encode] ABR fallback ${attempt}/${maxFallbackAttempts} — video=${currentBitrate}k (ratio ${safeRatio.toFixed(2)})`,
        );

        const progressStart = attempt === 1 ? 0.6 : 0.75;
        const fallbackHandler = ({ progress: p }: { progress: number }) => {
          onProgress(progressStart + Math.min(p, 1) * 0.15);
        };
        ff.on("progress", fallbackHandler);

        try {
          if (format === "WEBM") {
            const args = [
              ...baseArgs,
              "-c:v",
              "libvpx",
              "-b:v",
              `${currentBitrate}k`,
              ...(includeAudio ? ["-c:a", "libvorbis", "-b:a", `${aBitrate}k`] : ["-an"]),
              "-y",
              outputName,
            ];
            onLog(`[run] ffmpeg ${args.join(" ")}`);
            const code = await ff.exec(args);
            if (code !== 0) throw new Error(`FFmpeg fallback ${attempt} exited with code ${code}`);
          } else {
            const args = [
              ...baseArgs,
              "-c:v",
              "libx264",
              "-preset",
              preset,
              "-b:v",
              `${currentBitrate}k`,
              "-maxrate",
              `${Math.round(currentBitrate * 1.1)}k`,
              "-bufsize",
              `${currentBitrate * 2}k`,
              ...(includeAudio ? ["-c:a", "aac", "-b:a", `${aBitrate}k`] : ["-an"]),
              "-movflags",
              "+faststart",
              "-y",
              outputName,
            ];
            onLog(`[run] ffmpeg ${args.join(" ")}`);
            const code = await ff.exec(args);
            if (code !== 0) throw new Error(`FFmpeg fallback ${attempt} exited with code ${code}`);
          }
        } finally {
          ff.off("progress", fallbackHandler);
        }

        finalData = (await ff.readFile(outputName)) as Uint8Array;
        finalSize = finalData.byteLength;
        onLog(
          `[size] fallback ${attempt}/${maxFallbackAttempts}: ${prettyBytes(finalSize)} (limit: ${prettyBytes(maxBytes)})`,
        );
      }
    }

    onProgress(0.92);

    const mimeType = format === "WEBM" ? "video/webm" : "video/mp4";
    const blob = new Blob([finalData], { type: mimeType });

    if (maxBytes !== null && blob.size > maxBytes) {
      throw new Error(
        `Output ${prettyBytes(blob.size)} exceeds configured limit ${prettyBytes(maxBytes)} after ${maxFallbackAttempts} fallback attempts`,
      );
    }

    onLog(
      maxBytes !== null
        ? `[done] output ${prettyBytes(blob.size)} / target ${prettyBytes(maxBytes)}`
        : `[done] output ${prettyBytes(blob.size)} / size limit disabled`,
    );
    onProgress(1);
    return blob;
  } finally {
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
