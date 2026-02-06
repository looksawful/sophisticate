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
  onProgress(0.1);

  const logHandler = ({ message }: { message: string }) => onLog(`[ffmpeg] ${message}`);
  const progressHandler = ({ progress: p }: { progress: number }) => {
    onProgress(0.2 + Math.min(p, 1) * 0.7);
  };

  ff.on("log", logHandler);
  ff.on("progress", progressHandler);

  try {
    const ext = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".mp4";
    const inputName = `input${ext}`;
    await ff.writeFile(inputName, await fetchFile(file));
    onLog(`[input] loaded ${prettyBytes(file.size)}`);
    onProgress(0.2);

    const px = cropPixels(crop, videoWidth, videoHeight);
    const cropFilter = `crop=${px.w}:${px.h}:${px.x}:${px.y}`;
    onLog(`[crop] ${cropFilter}`);

    const vBitrate = targetBitrate(maxSizeMB, duration);
    const aBitrate = 128;
    onLog(`[encode] target video=${vBitrate}k audio=${aBitrate}k`);

    const outputName = format === "WEBM" ? "output.webm" : "output.mp4";
    const args: string[] = ["-i", inputName, "-vf", cropFilter];

    if (format === "WEBM") {
      args.push("-c:v", "libvpx", "-b:v", `${vBitrate}k`, "-c:a", "libvorbis", "-b:a", `${aBitrate}k`);
    } else {
      args.push(
        "-c:v", "libx264", "-preset", "fast",
        "-b:v", `${vBitrate}k`, "-maxrate", `${vBitrate}k`, "-bufsize", `${vBitrate * 2}k`,
        "-c:a", "aac", "-b:a", `${aBitrate}k`,
      );
    }

    args.push("-y", outputName);
    onLog(`[run] ffmpeg ${args.join(" ")}`);

    const exitCode = await ff.exec(args);
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);
    onProgress(0.9);

    const data = (await ff.readFile(outputName)) as Uint8Array;
    const mimeType = format === "WEBM" ? "video/webm" : "video/mp4";
    const blob = new Blob([data], { type: mimeType });
    onLog(`[done] output ${prettyBytes(blob.size)}`);

    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}

    onProgress(1);
    return blob;
  } finally {
    ff.off("log", logHandler);
    ff.off("progress", progressHandler);
  }
}
