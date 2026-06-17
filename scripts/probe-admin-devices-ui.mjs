import { chromium } from "playwright";

const base = process.env.BASE_URL || "https://trassa.duckdns.org";
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

try {
  await page.goto(`${base}/#/services`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => sessionStorage.setItem("trassa_intro_done", "1"));

  const loginRes = await page.evaluate(async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ksenia@trassa.local", password: "KseniaAdm8" }),
    });
    const body = await res.json();
    if (body.ok && body.adminToken) {
      sessionStorage.setItem("trassa-admin-api-token", body.adminToken);
      sessionStorage.setItem("trassa-admin-session-v1", "ksenia@trassa.local");
      return { ok: true };
    }
    return { ok: false, body };
  });
  console.log("login:", loginRes);

  await page.goto(`${base}/#/services`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const dismiss = page.getByRole("button", { name: /^понятно$/i });
  if (await dismiss.count()) await dismiss.first().click().catch(() => {});

  const adminBtn = page.getByRole("button", { name: /админ-панель/i });
  if (!(await adminBtn.count())) throw new Error("Admin button not found");
  await adminBtn.click();
  await page.waitForTimeout(2000);

  const devicesTab = page.getByRole("button", { name: /выход с устройств/i });
  if (!(await devicesTab.count())) throw new Error("Devices tab not found");
  await devicesTab.click();
  await page.waitForTimeout(2500);

  const bodyText = await page.locator("body").innerText();
  const hasTable =
    bodyText.includes("Все устройства") &&
    (bodyText.includes("Заметка") || bodyText.includes("Устройств пока нет"));
  console.log("devices panel visible:", hasTable);

  const openBtn = page.locator(".admin-devices-panel__device-open").first();
  if (await openBtn.count()) {
    await openBtn.click();
    await page.waitForTimeout(3500);
    const expanded = await page.locator(".admin-devices-panel__row--visits").count();
    const hasGeoTitle = (await page.locator("body").innerText()).includes(
      "Местоположение устройства"
    );
    const hasMap = (await page.locator(".admin-devices-panel__geo-map").count()) > 0;
    const hasHint = (await page.locator("body").innerText()).includes("Координаты");
    console.log("expanded row:", expanded, "geo section:", hasGeoTitle, "map:", hasMap, "hint:", hasHint);
    if (!hasGeoTitle) errors.push("geo section missing after expand");
  } else {
    console.log("no devices to expand");
  }

  if (errors.length) {
    console.log("ERRORS:", errors);
    process.exit(1);
  }
  console.log("UI probe OK");
} finally {
  await browser.close();
}
