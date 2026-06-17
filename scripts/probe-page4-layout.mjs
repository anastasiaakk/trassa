import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:5174";

const routes = [
  { name: "home", path: "/#/page4" },
  { name: "students", path: "/#/page4/recommendations" },
  { name: "forms", path: "/#/page4/forms" },
  { name: "teams", path: "/#/page4/teams" },
  { name: "documents", path: "/#/page4/documents" },
  { name: "proforientation", path: "/#/page4/proforientation" },
];

function box(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) };
  }, selector);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem("trassa-portal-design", "v2");
  localStorage.setItem("trassa_intro_done", "1");
  sessionStorage.setItem("trassa_intro_done", "1");
  document.documentElement.dataset.portalDesign = "v2";
});
await page.waitForTimeout(500);

const results = [];
for (const route of routes) {
  await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  const m = {
    route: route.name,
    kpi: await box(page, ".cabinet-v2-page-kpi"),
    stage: await box(page, ".page4-v2__main-region"),
    page: await box(page, ".page4-v2__main-region > .page4-v2__page"),
    routeShell: await box(page, ".page4-v2-shell"),
    bodyStage: await box(page, ".cabinet-v2-dashboard-stage"),
  };
  results.push(m);
  console.log(JSON.stringify(m));
}

const kpiW = results[0]?.kpi?.w ?? 0;
for (const r of results) {
  const stageW = r.stage?.w ?? 0;
  const ok = kpiW && stageW && Math.abs(stageW - kpiW) <= 4;
  console.log(`${r.route}: stage=${stageW} kpi=${kpiW} match=${ok} hasPage=${Boolean(r.page)}`);
}

await browser.close();
