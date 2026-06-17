import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:5174";
const adminEmail = process.env.TRASSA_PROBE_ADMIN_EMAIL;
const adminPassword = process.env.TRASSA_PROBE_ADMIN_PASSWORD;
const url = `${base}/#/services`;

const logs = [];
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  const line = `[${msg.type()}] ${msg.text()}`;
  logs.push(line);
  if (msg.type() === "error") errors.push(line);
});
page.on("pageerror", (err) => {
  errors.push(`[pageerror] ${err.message}`);
});

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => sessionStorage.setItem("trassa_intro_done", "1"));
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);

  let bodyText = await page.locator("body").innerText();
  console.log("After load, body preview:", bodyText.slice(0, 300).replace(/\s+/g, " "));

  const dismiss = page.getByRole("button", { name: /^понятно$/i });
  if (await dismiss.count()) {
    await dismiss.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    bodyText = await page.locator("body").innerText();
  }

  const adminBtn = page.getByRole("button", { name: /админ-панель/i });
  if (!(await adminBtn.count())) {
    console.log("No admin button. Full body:", bodyText.slice(0, 800));
    await page.screenshot({ path: "scripts/admin-probe-no-btn.png", fullPage: true });
    throw new Error("Admin button not found");
  }
  await adminBtn.click();
  await page.waitForTimeout(1000);

  if (!adminEmail || !adminPassword) {
    console.log("Skip API login: set TRASSA_PROBE_ADMIN_EMAIL and TRASSA_PROBE_ADMIN_PASSWORD");
  } else {
  const loginRes = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      try {
        const body = JSON.parse(text);
        if (body.ok && body.adminToken) {
          sessionStorage.setItem("trassa-admin-api-token", body.adminToken);
          sessionStorage.setItem("trassa-admin-session-v1", email);
          return { ok: true };
        }
        return { ok: false, status: res.status, text: text.slice(0, 120) };
      } catch {
        return { ok: false, status: res.status, text: text.slice(0, 120) };
      }
    },
    { email: adminEmail, password: adminPassword }
  );
  console.log("API login from page:", loginRes);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const dismiss2 = page.getByRole("button", { name: /^понятно$/i });
  if (await dismiss2.count()) await dismiss2.first().click().catch(() => {});

  const adminBtn2 = page.getByRole("button", { name: /админ-панель/i });
  if (await adminBtn2.count()) await adminBtn2.click();
  await page.waitForTimeout(4000);
  }

  bodyText = await page.locator("body").innerText();
  const adminMarkers = [
    "Главная",
    "Настройки",
    "Вход в личный кабинет",
    "ТрассА Admin",
    "Загрузка панели",
  ].filter((t) => bodyText.includes(t));

  console.log("URL:", page.url());
  console.log("Admin markers found:", adminMarkers.join(", ") || "(none)");
  console.log("Body text length:", bodyText.length);
  console.log("Body preview:", bodyText.slice(0, 400).replace(/\s+/g, " "));

  if (errors.length) {
    console.log("\n=== ERRORS ===");
    for (const e of errors) console.log(e);
  } else {
    console.log("\nNo page errors captured.");
  }

  await page.screenshot({ path: "scripts/admin-probe.png", fullPage: true });
  console.log("Screenshot: scripts/admin-probe.png");
} catch (e) {
  console.error("PROBE FAIL:", e.message);
  if (errors.length) {
    console.log("Captured errors:");
    errors.forEach((x) => console.log(x));
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
