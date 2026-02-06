import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { type Crop, cropPixels, prettyBytes, targetBitrate } from "./videoUtils";

let ffmpegInstance: FFmpeg | null = null;

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
}

export async function processVideo(file: File, options: ProcessOptions): Promise<Blob> {
  const { crop, maxSizeMB, format, videoWidth, videoHeight, duration, onLog, onProgress } = options;

  onLog("[init] loading FFmpeg WASM core...");
  const ff = await getFFmpeg();
  onLog("[init] FFmpeg ready");
  onProgress(0.05);

  const logHandler = ({ message }: { message: string }) => onLog(`[ffmpeg] ${message}`);

  ff.on("log", logHandler);

  try {
    const ext = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".mp4";
    const inputName = `input${ext}`;
    await ff.writeFile(inputName, await fetchFile(file));
    onLog(`[input] loaded ${prettyBytes(file.size)}`);
    onProgress(0.1);

    const px = cropPixels(crop, videoWidth, videoHeight);
    const cropFilter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    onLog(`[crop] ${cropFilter} (from ${videoWidth}x${videoHeight})`);

    const aBitrate = 128;
    const outputName = format === "WEBM" ? "output.webm" : "output.mp4";

    const maxBytes = maxSizeMB * 1024 * 1024;
    const overhead = 0.98;
    const vBitrate = targetBitrate(maxSizeMB * overhead, duration, aBitrate);
    onLog(`[encode] pass 1 — target video=${vBitrate}k audio=${aBitrate}k`);

    const pass1handler = ({ progress: p }: { progress: number }) => {
      onProgress(0.1 + Math.min(p, 1) * 0.35);
    };
    ff.on("progress", pass1handler);

    const baseArgs = ["-i", inputName, "-vf", cropFilter];

    if (format === "WEBM") {
      const args1 = [...baseArgs, "-c:v", "libvpx", "-b:v", `${vBitrate}k`,
        "-c:a", "libvorbis", "-b:a", `${aBitrate}k`, "-y", outputName];
      onLog(`[run] ffmpeg ${args1.join(" ")}`);
      const code1 = await ff.exec(args1);
      if (code1 !== 0) throw new Error(`FFmpeg pass 1 exited with code ${code1}`);
    } else {
      const args1 = [...baseArgs,
        "-c:v", "libx264", "-preset", "medium",
        "-b:v", `${vBitrate}k`, "-maxrate", `${Math.round(vBitrate * 1.1)}k`,
        "-bufsize", `${vBitrate * 2}k`,
        "-c:a", "aac", "-b:a", `${aBitrate}k`,
        "-movflags", "+faststart",
        "-y", outputName];
      onLog(`[run] ffmpeg ${args1.join(" ")}`);
      const code1 = await ff.exec(args1);
      if (code1 !== 0) throw new Error(`FFmpeg pass 1 exited with code ${code1}`);
    }

    ff.off("progress", pass1handler);
    onProgress(0.5);

    const data1 = (await ff.readFile(outputName)) as Uint8Array;
    const size1 = data1.byteLength;
    onLog(`[size] pass 1 result: ${prettyBytes(size1)} (target: ${prettyBytes(maxBytes)})`);

    if (size1 > maxBytes && size1 > 0) {
      const ratio = maxBytes / size1;
      const safeRatio = Math.max(0.3, ratio * 0.95);
      const vBitrate2 = Math.max(50, Math.round(vBitrate * safeRatio));
      onLog(`[encode] pass 2 — adjusted video=${vBitrate2}k (ratio ${safeRatio.toFixed(2)})`);

      const pass2handler = ({ progress: p }: { progress: number }) => {
        onProgress(0.5 + Math.min(p, 1) * 0.4);
      };
      ff.on("progress", pass2handler);

      if (format === "WEBM") {
        const args2 = [...baseArgs, "-c:v", "libvpx", "-b:v", `${vBitrate2}k`,
          "-c:a", "libvorbis", "-b:a", `${aBitrate}k`, "-y", outputName];
        onLog(`[run] ffmpeg ${args2.join(" ")}`);
        const code2 = await ff.exec(args2);
        if (code2 !== 0) throw new Error(`FFmpeg pass 2 exited with code ${code2}`);
      } else {
        const args2 = [...baseArgs,
          "-c:v", "libx264", "-preset", "medium",
          "-b:v", `${vBitrate2}k`, "-maxrate", `${Math.round(vBitrate2 * 1.1)}k`,
          "-bufsize", `${vBitrate2 * 2}k`,
          "-c:a", "aac", "-b:a", `${aBitrate}k`,
          "-movflags", "+faststart",
          "-y", outputName];
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

    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}

    onProgress(1);
    return blob;
  } finally {
    ff.off("log", logHandler);
  }
}
