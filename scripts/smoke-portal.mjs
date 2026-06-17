#!/usr/bin/env node
/**
 * Быстрая smoke-проверка портала (локально или production).
 * Usage: node scripts/smoke-portal.mjs
 *        TRASSA_SMOKE_BASE=https://trassa.duckdns.org node scripts/smoke-portal.mjs
 */
const BASE = (process.env.TRASSA_SMOKE_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");

const checks = [
  { name: "health", path: "/api/health", expect: (b) => b.ok === true },
  { name: "portal-version", path: "/api/portal/version", expect: (b) => b.ok === true },
  { name: "portal-region", path: "/api/portal/region", expect: (b) => b.ok === true },
];

async function run() {
  console.log(`Smoke: ${BASE}`);
  let failed = 0;
  for (const c of checks) {
    try {
      const res = await fetch(`${BASE}${c.path}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !c.expect(body)) {
        console.error(`  FAIL ${c.name} status=${res.status}`, body);
        failed++;
      } else {
        console.log(`  OK   ${c.name}`);
      }
    } catch (e) {
      console.error(`  FAIL ${c.name}`, e instanceof Error ? e.message : e);
      failed++;
    }
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll smoke checks passed.");
}

void run();
