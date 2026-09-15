import { copyFile, mkdir, stat } from "node:fs/promises";
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
