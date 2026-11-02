import { createServer } from "node:http";
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
  if ((await page.getByRole("main").count()) !== 1) throw new Error("Missing main landmark");
  if ((await page.getByRole("heading", { name: "Sophisticate video editor", level: 1 }).count()) !== 1) {
    throw new Error("Missing screen-reader page heading");
  }
  if ((await page.locator('input[type="file"][aria-label]').count()) !== 2) {
    throw new Error("Both file inputs must have accessible names");
  }
  qaChecks.push("semantic-main-and-upload-names");

  const trimStart = page.getByRole("slider", { name: "Trim start" });
  const trimEnd = page.getByRole("slider", { name: "Trim end" });
  if ((await trimStart.count()) !== 1 || (await trimEnd.count()) !== 1) {
    throw new Error("Missing keyboard-accessible trim handles");
  }
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
  if ((await cropOff.getAttribute("aria-pressed")) !== "false") throw new Error("Crop OFF missing aria-pressed=false");
  await cropOff.click();
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

  // Exercise the second supported output container in real Chrome.
  await page.getByRole("button", { name: "WEBM", exact: true }).click();
  await processButton.click();
  await page.waitForFunction(
    () => document.querySelector('[role="status"]')?.textContent === "Video ready to download",
    undefined,
    { timeout: 120_000 },
  );
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
