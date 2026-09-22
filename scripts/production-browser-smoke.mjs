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
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("response", (response) => {
  const u = response.url();
  if (/ffmpeg-(?:worker|core)|\.wasm(?:\?|$)/.test(u)) {
    runtimeRequests.push({ url: u, status: response.status() });
  }
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

  const required = ["ffmpeg-worker/worker.js", "ffmpeg-core/ffmpeg-core.js", "ffmpeg-core/ffmpeg-core.wasm"];
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
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
