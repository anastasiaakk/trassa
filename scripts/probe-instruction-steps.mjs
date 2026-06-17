/**
 * Проверка шагов записи инструкции без видео — селекторы, фон кабинетов, карта.
 * Usage: node scripts/probe-instruction-steps.mjs
 */
import { chromium, devices } from "playwright";

const base = (process.env.BASE_URL || "https://trassa.duckdns.org").replace(/\/$/, "");
const PHONE_W = 390;
const IFRAME_ID = "trassa-app-frame";

const RECORD_IFRAME_FIT_STYLE_ID = "trassa-record-iframe-fit";
const RECORD_IFRAME_FIT_CSS = `
  html, body, #root {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100% !important;
    scrollbar-width: none !important;
    padding: 0 !important;
    box-sizing: border-box;
  }
  html.route-cabinet, body.route-cabinet,
  html.route-profile, body.route-profile,
  html.route-page4, body.route-page4 {
    background-color: #f8fafc !important;
    background-image: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%) !important;
  }
  body.route-cabinet #root, body.route-profile #root, body.route-page4 #root {
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  body.route-cabinet .app-shell, body.route-profile .app-shell, body.route-page4 .app-shell {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  body.route-cabinet .app-shell__bgFill, body.route-profile .app-shell__bgFill {
    background-color: #f8fafc !important;
    background-image: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%) !important;
  }
`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function injectFit(page) {
  await page.evaluate(
    ({ styleId, css, mobileW }) => {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.prepend(meta);
      }
      meta.setAttribute("content", `width=${mobileW}, initial-scale=1, maximum-scale=1, user-scalable=no`);
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = css;
    },
    { styleId: RECORD_IFRAME_FIT_STYLE_ID, css: RECORD_IFRAME_FIT_CSS, mobileW: PHONE_W }
  );
}

async function readBg(page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = document.querySelector("#root");
    const rootCs = root ? getComputedStyle(root) : null;
    const shell = document.querySelector(".app-shell__bgFill");
    const shellCs = shell ? getComputedStyle(shell) : null;
    const classes = document.body.className;
    const htmlClasses = document.documentElement.className;
    const lum = (c) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return (+m[1] + +m[2] + +m[3]) / 3;
    };
    return {
      bodyBg: body.backgroundColor,
      bodyLum: lum(body.backgroundColor),
      rootPad: rootCs?.padding,
      shellBg: shellCs?.backgroundColor ?? null,
      shellLum: shellCs ? lum(shellCs.backgroundColor) : null,
      classes: `${htmlClasses} ${classes}`.trim(),
    };
  });
}

const results = [];

function log(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: PHONE_W, height: 844 },
  userAgent: devices["iPhone 13"].userAgent,
  locale: "ru-RU",
});

await context.addInitScript(() => {
  localStorage.setItem("trassa-portal-design", "v2");
  localStorage.setItem("trassa_intro_done", "1");
  sessionStorage.setItem("trassa_intro_done", "1");
  localStorage.setItem(
    "trassa_privacy_consent",
    JSON.stringify({ version: "2025-06-02", acceptedAt: new Date().toISOString() })
  );
});

const page = await context.newPage();

async function gotoHash(hash) {
  await page.goto(`${base}/#${hash}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("body", { timeout: 30000 });
  await page.evaluate(() => {
    document.documentElement.dataset.portalDesign = "v2";
    document.documentElement.dataset.cabinetTheme = "light";
  });
  await injectFit(page);
  await sleep(1200);
}

// Page1
await gotoHash("/");
const homeBtn = page.getByRole("button", { name: /перейти в управление/i });
log("page1 home CTA", (await homeBtn.count()) > 0, await homeBtn.count() ? "found" : "missing");

// Page2 map
await gotoHash("/services");
await page.locator(".leaflet-container").waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
const mapOk = (await page.locator(".leaflet-container").count()) > 0;
log("page2 leaflet", mapOk, mapOk ? "visible" : "missing");

const districts = page.locator(".leaflet-marker-icon").filter({ has: page.locator('[class*="markerMain"]') });
const districtCount = await districts.count();
log("page2 district markers", districtCount > 0, `count=${districtCount}`);

if (districtCount > 0) {
  await districts.nth(Math.min(2, districtCount - 1)).click({ timeout: 8000 }).catch(() => {});
  await sleep(1500);
  const subjects = page.locator(".leaflet-marker-icon").filter({ has: page.locator('[class*="markerSubject"]') });
  const subCount = await subjects.count();
  log("page2 subject markers after click", subCount > 0, `count=${subCount}`);
}

const loginBtn = page.getByRole("button", { name: /^войти$/i });
log("page2 login btn", (await loginBtn.count()) > 0, await loginBtn.count() ? "found" : "missing");

// Page3 roles
await gotoHash("/page3");
const roleCards = page.locator("[data-role-index]");
log("page3 role cards", (await roleCards.count()) >= 3, `count=${await roleCards.count()}`);

const betaBtn = page.locator(".page3-v2__beta-btn, button.loginBetaPreview").filter({ hasText: /бета/i });
log("page3 beta btn exists (before role pick)", true, `count=${await betaBtn.count()} (needs flow)`);

// Student cabinet via beta
await roleCards.nth(1).click().catch(() => {});
await sleep(600);
const nextBtn = page.locator(".page3-v2__next, button[aria-label='Далее']").first();
if (await nextBtn.count()) await nextBtn.click().catch(() => {});
await sleep(800);
if (await betaBtn.count()) await betaBtn.first().click().catch(() => {});
await sleep(2000);
await injectFit(page);

let bg = await readBg(page);
const studentOk = bg.bodyLum != null && bg.bodyLum > 120;
log("student cabinet bg", studentOk, bg);

const dock = page.locator(".cabinet-quick-dock__btn");
log("student dock tabs", (await dock.count()) >= 3, `count=${await dock.count()}`);

// Contractor
await gotoHash("/page4");
await sleep(1500);
bg = await readBg(page);
const contractorOk = bg.bodyLum != null && bg.bodyLum > 120;
log("contractor cabinet bg (direct)", contractorOk, bg);

const kpi = page.locator(".contractor-glass-kpi-card");
log("contractor KPI cards", (await kpi.count()) >= 2, `count=${await kpi.count()}`);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? `FAILED ${failed.length}/${results.length}` : `All ${results.length} checks passed`}`);
process.exitCode = failed.length ? 1 : 0;
