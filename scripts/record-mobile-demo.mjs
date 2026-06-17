/**
 * Запись демо-видео пользования порталом на «телефоне» (Playwright + iPhone 13).
 * Usage: node scripts/record-mobile-demo.mjs
 * Env: BASE_URL=https://trassa.duckdns.org (default)
 */
import { chromium, devices } from "playwright";
import { mkdir, rename, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "videos");
const base = (process.env.BASE_URL || "https://trassa.duckdns.org").replace(/\/$/, "");

const PRIVACY_CONSENT = JSON.stringify({
  version: "2025-06-02",
  acceptedAt: new Date().toISOString(),
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function prepareSession(page) {
  await page.addInitScript((consentJson) => {
    try {
      sessionStorage.setItem("trassa_intro_done", "1");
      localStorage.setItem("trassa_intro_done", "1");
      localStorage.setItem("trassa-portal-design", "v2");
      localStorage.setItem("_p_pc_v1", consentJson);
      sessionStorage.setItem("_p_pc_v1", consentJson);
      document.documentElement.dataset.portalDesign = "v2";
    } catch {
      /* ignore */
    }
  }, PRIVACY_CONSENT);
}

async function dismissOverlays(page) {
  const btn = page.getByRole("button", { name: /^понятно$/i });
  if (await btn.count()) {
    await btn.first().click({ timeout: 3000 }).catch(() => {});
    await sleep(400);
  }
}

async function smoothScroll(page, deltaY, steps = 8) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i += 1) {
    await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "auto" }), step);
    await sleep(80);
  }
}

async function waitPortalReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 90000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  await sleep(1200);
  await dismissOverlays(page);
}

async function enterContractorBetaPreview(page) {
  await page.goto(`${base}/#/page3`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitPortalReady(page);

  const contractorCard = page.locator('[data-role-index="2"]');
  await contractorCard.waitFor({ state: "visible", timeout: 20000 });
  await contractorCard.click();
  await sleep(900);

  const betaBtn = page.getByRole("button", { name: /бета-просмотр/i });
  if (await betaBtn.count()) {
    await betaBtn.click();
    await page.waitForURL(/#\/page4/, { timeout: 30000 }).catch(() => {});
    await waitPortalReady(page);
    if (page.url().includes("/page4")) return true;
  }

  await page.evaluate(() => {
    const profile = {
      messengerUid: "beta-preview-role-2",
      notifyEmail: false,
      notifyPush: false,
      specializationId: "",
      phone: "+7 (900) 000-00-00",
      firstName: "Дмитрий",
      lastName: "Подрядов",
      roleLabel: "Координатор проектов",
      contractorCompanyName: "Демо-организация",
      email: "beta-contractor@preview.trassa",
    };
    localStorage.setItem("trassa-profile-settings-v1", JSON.stringify(profile));
    sessionStorage.setItem("trassa-cabinet-beta-preview", "1");
    sessionStorage.setItem("trassaPortalRole", "2");
  });
  await page.goto(`${base}/#/page4`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitPortalReady(page);
  return true;
}

function convertToMp4(webmPath, mp4Path) {
  let ffmpegPath;
  try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  } catch {
    console.warn("ffmpeg not available — keeping .webm only");
    return webmPath;
  }

  const r = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Path,
    ],
    { stdio: "inherit" }
  );

  if (r.status !== 0) {
    console.warn("ffmpeg conversion failed — keeping .webm");
    return webmPath;
  }
  return mp4Path;
}

await mkdir(outDir, { recursive: true });

console.log(`Recording mobile demo: ${base}\n`);

const browser = await chromium.launch({ headless: true });
const device = devices["iPhone 13"];
const videoDir = path.join(outDir, "_tmp");

const context = await browser.newContext({
  ...device,
  recordVideo: {
    dir: videoDir,
    size: { width: 390, height: 844 },
  },
  locale: "ru-RU",
});

const page = await context.newPage();
await prepareSession(page);

try {
  console.log("1/6 — Главная страница");
  await page.goto(`${base}/#/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitPortalReady(page);
  await smoothScroll(page, 420);
  await sleep(1500);
  await smoothScroll(page, -180);
  await sleep(800);

  console.log("2/6 — Карта подрядчиков");
  const cta = page.getByRole("button", { name: /перейти в управление/i });
  if (await cta.count()) {
    await cta.click();
  } else {
    await page.goto(`${base}/#/services`, { waitUntil: "domcontentloaded" });
  }
  await waitPortalReady(page);
  await sleep(2000);
  await smoothScroll(page, 260);
  await sleep(1200);

  console.log("3/6 — Вход и выбор роли подрядчика");
  const loginBtn = page.getByRole("button", { name: /^войти$/i });
  if (await loginBtn.count()) {
    await loginBtn.first().click();
    await waitPortalReady(page);
  } else {
    await page.goto(`${base}/#/page3`, { waitUntil: "domcontentloaded" });
    await waitPortalReady(page);
  }

  console.log("4/6 — Кабинет подрядчика");
  await enterContractorBetaPreview(page);
  await sleep(2000);
  await smoothScroll(page, 520);
  await sleep(1800);
  await smoothScroll(page, 380);
  await sleep(1500);

  console.log("5/6 — Таблицы и планировщик");
  const formsKpi = page.getByText(/таблиц/i).first();
  if (await formsKpi.count()) {
    await formsKpi.click({ timeout: 5000 }).catch(() => {});
    await waitPortalReady(page);
    await sleep(2500);
    await smoothScroll(page, 400);
    await sleep(1200);
  }

  await page.goto(`${base}/#/page4/planner`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitPortalReady(page);
  await sleep(2000);
  await smoothScroll(page, 350);
  await sleep(1500);

  console.log("6/6 — Возврат на главную кабинета");
  await page.goto(`${base}/#/page4`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitPortalReady(page);
  await sleep(2500);

  const video = page.video();
  await page.close();
  await context.close();

  const webmSrc = await video.path();
  const webmDest = path.join(outDir, "mobile-demo.webm");
  const mp4Dest = path.join(outDir, "mobile-demo.mp4");

  await rename(webmSrc, webmDest);
  console.log(`\n✓ WebM: ${webmDest}`);

  const finalPath = convertToMp4(webmDest, mp4Dest);
  if (finalPath === mp4Dest) {
    console.log(`✓ MP4:  ${mp4Dest}`);
    try {
      await unlink(webmDest);
    } catch {
      /* keep both */
    }
  }

  console.log("\nDone.");
} catch (e) {
  console.error("Recording failed:", e);
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
}
