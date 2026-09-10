import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = resolve(root, "test-fixtures");
const video320 = resolve(fixtureDir, "test-320x240-3s.mp4");
const video640 = resolve(fixtureDir, "test-640x480-2s-noaudio.mp4");

mkdirSync(fixtureDir, { recursive: true });

function runFfmpeg(args, output) {
  if (existsSync(output)) return;

  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args, "-y", output], {
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    throw new Error(
      "ffmpeg CLI is required to generate integration-test fixtures. Install ffmpeg and rerun npm test.",
    );
  }

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while generating ${output} (exit ${result.status ?? "unknown"})`);
  }
}

runFfmpeg(
  [
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x240:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100",
    "-t",
    "3",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
  ],
  video320,
);

runFfmpeg(
  [
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=640x480:rate=24",
    "-t",
    "2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
  ],
  video640,
);

console.log("Integration-test video fixtures are ready.");
