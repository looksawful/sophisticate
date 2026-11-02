import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";

const root = process.cwd();
const outDir = join(root, "out");
const fixture = join(root, "test-fixtures", "test-320x240-3s.mp4");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/sophisticate";
const route = `${basePath.replace(/\/$/, "")}/`;

if (!existsSync(join(outDir, "index.html"))) {
  throw new Error("Production export missing out/index.html");
}
if (!existsSync(fixture)) throw new Error(`Fixture missing: ${fixture}`);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp4": "video/mp4",
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  const normalizedBase = basePath.replace(/\/$/, "");
  if (normalizedBase && pathname.startsWith(normalizedBase)) {
    pathname = pathname.slice(normalizedBase.length) || "/";
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const safe = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const file = join(outDir, safe.replace(/^[/\\]+/, ""));
  if (!file.startsWith(outDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Failed to start static server");
const url = `http://127.0.0.1:${address.port}${route}`;

const candidates = process.platform === "win32"
  ? [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : "",
    ]
  : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const executablePath = process.env.CHROME_PATH || candidates.find((p) => p && existsSync(p));
if (!executablePath) throw new Error("System Chrome executable not found");

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
const runtimeRequests = [];
const workerUrls = [];
const failedRequests = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("worker", (worker) => workerUrls.push(worker.url()));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("response", (response) => {
  const u = response.url();
  if (/ffmpeg-(?:worker|core)|\.wasm(?:\?|$)/.test(u)) {
    runtimeRequests.push({ url: u, status: response.status() });
  }
});
page.on("requestfailed", (request) => {
  failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
});

const verifyDownload = async (ext) => {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    page.getByRole("button", { name: /Download/i }).click(),
  ]);
  const name = download.suggestedFilename();
  if (!name.endsWith(`.${ext}`)) throw new Error(`Wrong download extension: ${name}`);
  const path = await download.path();
  if (!path) throw new Error("Download path not available");
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", path], { encoding: "utf8" }));
  if (!probe.streams?.some((stream) => stream.codec_type === "video")) {
    throw new Error(`Downloaded ${ext} has no valid video stream`);
  }
  const container = probe.format?.format_name ?? "";
  if (!(ext === "mp4" ? container.includes("mp4") : container.includes("webm"))) {
    throw new Error(`Unexpected downloaded ${ext} container: ${container}`);
  }
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  return { name, bytes: statSync(path).size, container, width: video.width, height: video.height };
};

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(fixture);

  await page.waitForFunction(
    () => document.body.textContent?.includes("320×240") || document.body.textContent?.includes("320x240"),
    undefined,
    { timeout: 30_000 },
  );

  // QA-only integration assertions for accessibility PRs 36–38.
  const qaChecks = [];

  // Temporary integration QA, kept on the existing verification branch only.
  const checkToolbar = async (state) => {
    for (const width of [320, 375, 390, 430, 640, 768, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const names = state === "source"
        ? ["Replace video", "Remove video", "Circle preview"]
        : ["Replace video", "Remove video"];
      const buttons = [];
      for (const name of names) {
        const locator = page.getByRole("button", { name: new RegExp("^" + name) });
        const rect = await locator.boundingBox();
        if (!rect) throw new Error(state + " missing " + name + " at " + width);
        const hit = await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          return element?.closest("button")?.textContent?.trim() || "";
        }, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
        if (!hit.startsWith(name)) {
          throw new Error(state + " " + name + " blocked by " + hit + " at " + width);
        }
        buttons.push({ name, ...rect });
      }
      if (state === "output") {
        const badge = page.getByText(/^Output ·/);
        const rect = await badge.boundingBox();
        if (!rect) throw new Error("Output badge missing at " + width);
        buttons.push({ name: "Output badge", ...rect });
      }
      for (let i = 0; i < buttons.length; i++) {
        for (let j = i + 1; j < buttons.length; j++) {
          const a = buttons[i], b = buttons[j];
          const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (x > 0 && y > 0) {
            throw new Error(state + " overlapping " + a.name + "/" + b.name + " at " + width);
          }
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  };
  if ((await page.getByRole("main").count()) !== 1) throw new Error("Missing main landmark");
  if ((await page.getByRole("heading", { name: "Sophisticate video editor", level: 1 }).count()) !== 1) {
    throw new Error("Missing screen-reader page heading");
  }
  if ((await page.locator('input[type="file"][aria-label]').count()) !== 2) {
    throw new Error("Both file inputs must have accessible names");
  }
  qaChecks.push("semantic-main-and-upload-names");
  await checkToolbar("source");
  qaChecks.push("source-preview-mobile-controls");

  const trimStart = page.getByRole("slider", { name: "Trim start" });
  const trimEnd = page.getByRole("slider", { name: "Trim end" });
  // Media dimensions may arrive before duration; require an actually interactive timeline.
  try {
    await trimStart.waitFor({ state: "visible", timeout: 30_000 });
    await trimEnd.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    console.error("QA_VIDEO_METADATA", JSON.stringify(await page.evaluate(() => ({
      videos: [...document.querySelectorAll("video")].map((v) => ({
        currentSrc: v.currentSrc, readyState: v.readyState, networkState: v.networkState,
        duration: v.duration, videoWidth: v.videoWidth, videoHeight: v.videoHeight,
      })),
      sliderCount: document.querySelectorAll('[role="slider"]').length,
      logText: document.querySelector("details")?.textContent?.slice(-1200) ?? "",
    })), null, 2));
    throw error;
  }
  const beforeTrim = Number(await trimStart.getAttribute("aria-valuenow"));
  await trimStart.focus();
  await trimStart.press("ArrowRight");
  const afterTrim = Number(await trimStart.getAttribute("aria-valuenow"));
  if (!(afterTrim > beforeTrim)) throw new Error("ArrowRight did not move Trim start");
  await trimStart.press("ArrowLeft");
  await trimStart.press("Escape");
  if (!(await page.getByRole("button", { name: /^Process$/ }).isEnabled())) {
    throw new Error("Escape from trim slider cleared or disabled the video");
  }
  qaChecks.push("keyboard-trim-and-shortcut-isolation");

  const cropOn = page.getByRole("button", { name: "Crop ON" });
  if ((await cropOn.getAttribute("aria-pressed")) !== "true") throw new Error("Crop ON missing aria-pressed=true");
  await cropOn.click();
  const cropOff = page.getByRole("button", { name: "Crop OFF" });
  if ((await cropOff.getAttribute("aria-pressed")) !== "false") {
    throw new Error("Crop OFF missing aria-pressed=false");
  }
  const inactivePreset = page.getByRole("button", { name: "1:1", exact: true });
  if (await inactivePreset.isEnabled()) throw new Error("Crop OFF left preset enabled");
  await cropOff.press("Enter");
  if (!(await page.getByRole("button", { name: "Crop ON" }).count())) {
    throw new Error("Enter on Crop OFF did not re-enable crop");
  }
  if (await page.getByRole("button", { name: "Stop", exact: true }).count()) {
    throw new Error("Enter on Crop OFF incorrectly started a video encode");
  }
  qaChecks.push("disabled-crop-and-enter-button-isolation");
  // Crop is already enabled through the keyboard action.
  qaChecks.push("toggle-semantics");

  await page.getByText("Processing log", { exact: true }).click();
  await page.getByRole("combobox", { name: "Filter processing logs" }).selectOption("errors");
  const searchLog = page.getByRole("textbox", { name: "Search processing logs" });
  await searchLog.fill("test search");
  await searchLog.press("Escape");
  if ((await searchLog.inputValue()) !== "test search") throw new Error("Escape destroyed log editor content");
  await searchLog.fill("");
  await page.getByRole("combobox", { name: "Filter processing logs" }).selectOption("all");
  qaChecks.push("log-control-names-and-shortcut-isolation");

  const processButton = page.getByRole("button", { name: /^Process$/ });
  await processButton.click();

  await page.waitForFunction(
    () => document.body.textContent?.includes("[init] FFmpeg ready"),
    undefined,
    { timeout: 60_000 },
  );

  await page.waitForFunction(
    () => document.body.textContent?.includes("[complete]"),
    undefined,
    { timeout: 120_000 },
  );

  const download = page.getByRole("button", { name: /Download/i });
  if (!(await download.isEnabled())) throw new Error("Download button is not enabled after encode");

  if ((await page.getByRole("status").textContent()) !== "Video ready to download") {
    throw new Error("Completed encode was not announced by live region");
  }
  qaChecks.push("completion-status");
  const mp4Download = await verifyDownload("mp4");
  await checkToolbar("output");
  qaChecks.push("output-preview-mobile-controls");

  // Exercise the second supported output container in real Chrome.
  await page.getByRole("button", { name: "WEBM", exact: true }).click();
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing video",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Video ready to download",
    undefined,
    { timeout: 120_000 },
  );
  await page.locator(".result-player-shell video").waitFor({ state: "attached", timeout: 15_000 });
  const webmArtifact = await page.evaluate(async () => {
    const player = document.querySelector(".result-player-shell video");
    if (!(player instanceof HTMLVideoElement)) throw new Error("WEBM result player missing");
    const res = await fetch(player.src);
    if (!res.ok) throw new Error("WEBM Blob URL not readable");
    const blob = await res.blob();
    const magic = [...new Uint8Array(await blob.slice(0, 4).arrayBuffer())];
    return { type: blob.type, size: blob.size, magic };
  });
  if (webmArtifact.type !== "video/webm" ||
      webmArtifact.magic.join(",") !== "26,69,223,163") {
    throw new Error("WEBM output MIME/container mismatch: " + JSON.stringify(webmArtifact));
  }
  if (!(webmArtifact.size > 0 && webmArtifact.size <= 0.49 * 1024 * 1024)) {
    throw new Error("WEBM output violates enabled 0.49 MB limit: " + JSON.stringify(webmArtifact));
  }
  if (!(await page.getByRole("button", { name: /Download/i }).isEnabled())) {
    throw new Error("WEBM result is not downloadable");
  }
  qaChecks.push("real-webm-container-and-output-size-limit");
  const webmDownload = await verifyDownload("webm");
  qaChecks.push("mp4-and-webm-downloaded-and-probed");

  // Verify optional stages are really omitted in the FFmpeg command, not just visually toggled.
  await page.getByRole("button", { name: "Crop ON" }).click();
  await page.getByRole("button", { name: "Limit ON" }).click();
  if (!(await page.getByRole("spinbutton", { name: "Maximum output file size in megabytes" }).isDisabled())) {
    throw new Error("Limit OFF left size input enabled");
  }
  qaChecks.push("disabled-size-control");
  await page.getByRole("button", { name: "MP4", exact: true }).click();
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing video",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Video ready to download",
    undefined,
    { timeout: 120_000 },
  );
  const stageLogs = await page.locator("body").innerText();
  if (!stageLogs.includes("[crop] disabled") || !stageLogs.includes("size limit disabled")) {
    throw new Error("Disabled crop/size stages not reflected in real processing logs");
  }
  if (/\[run\] ffmpeg[^\n]*\bcrop=/.test(stageLogs)) {
    throw new Error("Disabled crop still added FFmpeg crop filter");
  }
  qaChecks.push("crop-and-size-disabled-omit-stages");

  // Replace the result through the actual dropzone, not a programmatic picker.
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "replacement-video.mp4", { type: "video/mp4" }));
    return transfer;
  }, readFileSync(fixture).toString("base64"));
  await page.locator('input[aria-label="Choose a video file"]').locator("..").dispatchEvent("drop", { dataTransfer });
  await page.waitForFunction(
    () => document.body.textContent?.includes("[input] file: replacement-video.mp4"),
    undefined,
    { timeout: 30_000 },
  );
  await page.locator(".result-player-shell video").waitFor({ state: "detached", timeout: 15_000 });
  if (!(await page.getByRole("button", { name: /^Download$/ }).isDisabled())) {
    throw new Error("Drag/drop replacement did not clear the previous result");
  }
  qaChecks.push("dragdrop-replacement-clears-output");

  // Stop a genuine in-flight WEBM FFmpeg encode after its command is issued, then retry immediately.
  await page.getByRole("button", { name: "WEBM", exact: true }).click();
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing video",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => document.body.textContent?.includes("[run] ffmpeg ") &&
          document.body.textContent?.includes("output.webm"),
    undefined,
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing cancelled",
    undefined,
    { timeout: 30_000 },
  );
  if (!(await processButton.isEnabled())) throw new Error("Cannot restart after cancellation");
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing video",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Video ready to download",
    undefined,
    { timeout: 120_000 },
  );
  await page.locator(".result-player-shell video").waitFor({ state: "attached", timeout: 15_000 });
  const afterRetry = await page.evaluate(async () => {
    const src = document.querySelector(".result-player-shell video")?.src;
    if (!src) return null;
    const res = await fetch(src);
    return { type: (await res.blob()).type, size: Number(res.headers.get("content-length")) || 0 };
  });
  if (afterRetry?.type !== "video/webm") {
    throw new Error("Cancel/retry did not produce a WEBM result: " + JSON.stringify(afterRetry));
  }
  qaChecks.push("cancel-inflight-webm-and-immediate-retry");

  // 1:1 preset must produce square encoded dimensions, unlike the disabled crop stage.
  await page.getByRole("button", { name: "Crop OFF" }).click();
  await page.getByRole("button", { name: "1:1", exact: true }).click();
  await page.getByRole("button", { name: "MP4", exact: true }).click();
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Processing video",
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Video ready to download",
    undefined,
    { timeout: 120_000 },
  );
  const square = await verifyDownload("mp4");
  if (square.width !== 240 || square.height !== 240) {
    throw new Error("1:1 crop did not produce 240x240 encoded video: " + JSON.stringify(square));
  }
  qaChecks.push("square-preset-encoded-dimensions");

  const required = ["ffmpeg-core/ffmpeg-core.js", "ffmpeg-core/ffmpeg-core.wasm"];
  for (const needle of required) {
    const hit = runtimeRequests.find((r) => r.url.includes(needle) && r.status >= 200 && r.status < 400);
    if (!hit) throw new Error(`Missing successful local runtime request for ${needle}\n${JSON.stringify(runtimeRequests, null, 2)}`);
  }

  if (pageErrors.length) throw new Error(`Page errors:\n${pageErrors.join("\n")}\n`);
  const relevantConsoleErrors = consoleErrors.filter((line) => !/favicon|Failed to load resource.*404/i.test(line));
  if (relevantConsoleErrors.length) throw new Error(`Console errors:\n${relevantConsoleErrors.join("\n")}\n`);

  console.log(JSON.stringify({
    status: "PASS",
    platform: process.platform,
    chrome: await browser.version(),
    route,
    fixture: { name: "test-320x240-3s.mp4", size: statSync(fixture).size },
    runtimeRequests,
    workerUrls,
    qaChecks,
    webmArtifact,
    mp4Download,
    webmDownload,
    square,
  }, null, 2));
} catch (error) {
  console.error("SMOKE_DIAGNOSTICS", JSON.stringify({
    error: error instanceof Error ? error.stack || error.message : String(error),
    pageErrors,
    consoleErrors,
    failedRequests,
    runtimeRequests,
    workerUrls,
    bodyText: (await page.locator("body").innerText().catch(() => "")).slice(-12000),
  }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
