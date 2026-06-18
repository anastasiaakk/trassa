#!/usr/bin/env node
/**
 * Smoke: портал открывается в браузере (без логина в админку).
 * Usage:
 *   npm run build:web && npm run preview   # в другом терминале
 *   TRASSA_SMOKE_WEB_BASE=http://127.0.0.1:4173 node scripts/smoke-portal-web.mjs
 *   TRASSA_SMOKE_WEB_BASE=https://trassa.duckdns.org node scripts/smoke-portal-web.mjs
 */
import { chromium } from "playwright";

const BASE = (process.env.TRASSA_SMOKE_WEB_BASE || "https://trassa.duckdns.org").replace(
  /\/$/,
  ""
);

const PAGES = [
  { name: "home", hash: "#/" },
  { name: "map", hash: "#/services" },
  { name: "role-select", hash: "#/page3" },
  { name: "role-select-alias", hash: "#/role-select" },
  { name: "contractor-cabinet", hash: "#/page4" },
  { name: "association-rador", hash: "#/page5" },
  { name: "association-ado", hash: "#/page6" },
  { name: "privacy", hash: "#/privacy" },
];

async function skipIntro(page) {
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("trassa_intro_done", "1");
    } catch {
      /* ignore */
    }
  });
}

async function run() {
  console.log(`Web smoke: ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let failed = 0;

  for (const p of PAGES) {
    const url = `${BASE}/${p.hash}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await skipIntro(page);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(800);
      const text = await page.locator("body").innerText();
      if (!text.trim() || /application error/i.test(text)) {
        console.error(`  FAIL ${p.name}: empty or error page`);
        failed++;
      } else {
        console.log(`  OK   ${p.name}`);
      }
    } catch (e) {
      console.error(`  FAIL ${p.name}`, e instanceof Error ? e.message : e);
      failed++;
    }
  }

  await browser.close();
  if (failed) {
    console.error(`\n${failed} page(s) failed`);
    process.exit(1);
  }
  console.log("\nAll web smoke checks passed.");
}

void run();
