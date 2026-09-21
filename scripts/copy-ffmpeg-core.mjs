import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(repoRoot, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = path.join(repoRoot, "public", "ffmpeg-core");

const assets = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

await mkdir(targetDir, { recursive: true });

for (const asset of assets) {
  const source = path.join(sourceDir, asset);
  const target = path.join(targetDir, asset);
  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat?.isFile() || sourceStat.size === 0) {
    throw new Error(`Missing FFmpeg core asset: ${source}`);
  }
  await copyFile(source, target);
}

console.log(`Copied pinned FFmpeg core ${assets.join(", ")} to public/ffmpeg-core/.`);


const workerSourceDir = path.join(repoRoot, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const workerTargetDir = path.join(repoRoot, "public", "ffmpeg-worker");
await mkdir(workerTargetDir, { recursive: true });

const workerModules = (await readdir(workerSourceDir)).filter((name) => name.endsWith(".js"));
if (!workerModules.includes("worker.js")) {
  throw new Error(`Missing FFmpeg class worker: ${path.join(workerSourceDir, "worker.js")}`);
}
for (const asset of workerModules) {
  await copyFile(path.join(workerSourceDir, asset), path.join(workerTargetDir, asset));
}
console.log(`Copied pinned FFmpeg class worker modules to public/ffmpeg-worker/.`);
