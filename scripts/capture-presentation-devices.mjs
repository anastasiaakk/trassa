/**
 * Скриншоты портала для слайда «Устройства» презентации.
 * Usage: node scripts/capture-presentation-devices.mjs
 * Env: BASE_URL=https://trassa.duckdns.org (default)
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "presentation", "devices");
const base = (process.env.BASE_URL || "https://trassa.duckdns.org").replace(/\/$/, "");

const TARGETS = [
  {
    file: "portal-desktop.jpg",
    url: "/#/",
    viewport: { width: 1440, height: 900 },
    waitSelector: ".app-shell--page1, .page1-ambient, main",
  },
  {
    file: "portal-tablet.jpg",
    url: "/#/services",
    viewport: { width: 1024, height: 768 },
    waitSelector: ".app-shell--page2, main",
  },
  {
    file: "portal-phone.jpg",
    url: "/#/",
    device: "iPhone 13",
    waitSelector: ".app-shell--page1, main",
  },
];

async function dismissOverlays(page) {
  const btn = page.getByRole("button", { name: /^понятно$/i });
  if (await btn.count()) {
    await btn.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function prepareSession(page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("trassa_intro_done", "1");
      localStorage.setItem("trassa_intro_done", "1");
    } catch {
      /* ignore */
    }
  });
}

async function captureOne(browser, target) {
  const context = await browser.newContext(
    target.device
      ? { ...devices[target.device] }
      : {
          viewport: target.viewport,
          deviceScaleFactor: 2,
        }
  );
  const page = await context.newPage();
  await prepareSession(page);

  const fullUrl = `${base}${target.url}`;
  console.log(`→ ${target.file}: ${fullUrl}`);

  await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  try {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText ?? "";
        return (
          text.includes("ТрассА") &&
          (text.includes("кадр") ||
            text.includes("подрядчик") ||
            text.includes("портал") ||
            text.includes("карт"))
        );
      },
      { timeout: 45000 }
    );
  } catch {
    console.warn("  ⚠ portal content wait timed out, capturing anyway");
  }

  try {
    await page.waitForSelector(target.waitSelector, { timeout: 15000 });
  } catch {
    console.warn(`  ⚠ selector ${target.waitSelector} not found`);
  }

  await page.waitForTimeout(1200);

  const outPath = path.join(outDir, target.file);
  await page.screenshot({
    path: outPath,
    type: "jpeg",
    quality: 90,
    fullPage: false,
  });

  console.log(`  ✓ ${outPath}`);
  await context.close();
}

await mkdir(outDir, { recursive: true });

console.log(`Base URL: ${base}\n`);

const browser = await chromium.launch({ headless: true });
try {
  for (const target of TARGETS) {
    await captureOne(browser, target);
  }
  console.log("\nDone. Screenshots in public/presentation/devices/");
} catch (e) {
  console.error("Capture failed:", e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
