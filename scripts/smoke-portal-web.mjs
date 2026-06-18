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

/** mustContain — хотя бы одна подстрока должна быть на странице (регистронезависимо). */
const PAGES = [
  { name: "home", hash: "#/", mustContain: ["Специалист", "Поддержк", "Региональн"] },
  { name: "map", hash: "#/services", mustContain: ["карт", "Карт", "подрядчик"] },
  { name: "role-select", hash: "#/page3", mustContain: ["Выберите", "рол", "Рол"] },
  { name: "role-select-alias", hash: "#/role-select", mustContain: ["Выберите", "рол", "Рол"] },
  {
    name: "contractor-cabinet",
    hash: "#/page4",
    mustContain: ["подрядчик", "Подрядчик", "кабинет", "Кабинет"],
  },
  {
    name: "association-rador",
    hash: "#/page5",
    mustContain: ["РАДОР", "радор", "ассоциац", "Ассоциац"],
  },
  {
    name: "association-ado",
    hash: "#/page6",
    mustContain: ["АДО", "адо", "ассоциац", "Ассоциац"],
  },
  { name: "privacy", hash: "#/privacy", mustContain: ["политик", "Политик", "персональн"] },
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

function matchesAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

async function waitForPageReady(page, hash) {
  if (hash === "#/") {
    await page
      .waitForSelector('[aria-label="Показатели портала"]', { timeout: 18_000 })
      .catch(() => page.waitForTimeout(5500));
    return;
  }
  const cabinet = hash.includes("page4") || hash.includes("page5") || hash.includes("page6");
  await page.waitForTimeout(cabinet ? 1200 : 800);
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
      if (p.hash !== "#/") {
        await skipIntro(page);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      }
      await waitForPageReady(page, p.hash);
      const text = await page.locator("body").innerText();
      if (!text.trim() || /application error/i.test(text)) {
        console.error(`  FAIL ${p.name}: empty or error page`);
        failed++;
      } else if (p.mustContain && !matchesAny(text, p.mustContain)) {
        console.error(`  FAIL ${p.name}: expected one of [${p.mustContain.join(", ")}]`);
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
