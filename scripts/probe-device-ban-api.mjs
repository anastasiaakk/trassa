/**
 * Проверка API «Выход с устройств»: список, бан, gate hold, разбан.
 * Usage: node scripts/probe-device-ban-api.mjs
 */
const base = (process.env.BASE_URL || "https://trassa.duckdns.org").replace(/\/$/, "");
const adminEmail = process.env.TRASSA_ADMIN_EMAIL || "ksenia@trassa.local";
const adminPassword = process.env.TRASSA_ADMIN_PASSWORD || "KseniaAdm8";

const results = [];
function log(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${step}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function adminLogin() {
  const res = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok || !body.adminToken) {
    throw new Error(body.error || `login ${res.status}`);
  }
  return body.adminToken;
}

async function listDevices(token) {
  const res = await fetch(`${base}/api/admin/devices`, {
    headers: { "X-Trassa-Admin-Token": token },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error || `list ${res.status}`);
  return body.devices;
}

async function patchDevice(token, id, patch) {
  const res = await fetch(`${base}/api/admin/devices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Trassa-Admin-Token": token,
    },
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function encodeSessionBundle(deviceId) {
  const bundle = JSON.stringify({ s: deviceId });
  return Buffer.from(bundle, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function portalVersionHold(deviceId) {
  const k = await encodeSessionBundle(deviceId);
  const url = `${base}/api/portal/version?k=${encodeURIComponent(k)}&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json();
  return { status: res.status, body };
}

try {
  const token = await adminLogin();
  log("admin login", true, "token received");

  const devices = await listDevices(token);
  log("list devices", true, `count=${devices.length}`);

  if (devices.length === 0) {
    log("ban flow", true, "skipped — no devices in DB");
    console.log("\nAll checks passed (no devices to ban-test).");
    process.exit(0);
  }

  const target = devices.find((d) => !d.personal) ?? devices[0];
  const deviceId = target.id;
  const wasBanned = Boolean(target.banned);

  if (wasBanned) {
    const unban = await patchDevice(token, deviceId, { banned: false });
    log("pre-unban for test", unban.body.ok === true, unban.body);
  }

  const ban = await patchDevice(token, deviceId, { banned: true });
  log("ban device", ban.body.ok === true && ban.status === 200, ban.body);

  await new Promise((r) => setTimeout(r, 400));
  const held = await portalVersionHold(deviceId);
  const gateOn = held.body.h === 1 || held.body.code === "GATE_HOLD";
  log("portal gate hold after ban", gateOn, held.body);

  const unban = await patchDevice(token, deviceId, { banned: false });
  log("unban device", unban.body.ok === true, unban.body);

  await new Promise((r) => setTimeout(r, 400));
  const released = await portalVersionHold(deviceId);
  const gateOff = released.body.h !== 1 && released.body.code !== "GATE_HOLD";
  log("portal gate released after unban", gateOff, released.body);

  if (wasBanned) {
    await patchDevice(token, deviceId, { banned: true });
    log("restore original banned state", true, "re-banned");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(failed.length ? `\nFAILED ${failed.length}/${results.length}` : `\nAll ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
} catch (e) {
  console.error("Probe error:", e.message || e);
  process.exit(1);
}
