/**
 * Видео‑инструкция ~1:50 — презентация 16:9, 1080p.
 * Интро (нейтральный фон + текст) → смартфон с пояснениями → outro.
 *
 * Usage: npm run record:mobile-instruction
 */
import { chromium, devices } from "playwright";
import { copyFileSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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
const TARGET_SEC = Number(process.env.INSTRUCTION_DURATION_SEC || 120);
const NARRATION_ENABLED = process.env.INSTRUCTION_NARRATION !== "0";

const PRESENT_W = 1920;
const PRESENT_H = 1080;
const PHONE_W = 390;
const PHONE_H = 844;
const PHONE_LEFT = 80;
const PHONE_SCALE = 1;
const PHONE_DISPLAY_W = Math.round(PHONE_W * PHONE_SCALE);
const PHONE_DISPLAY_H = Math.round(PHONE_H * PHONE_SCALE);
const COPY_LEFT = PHONE_LEFT + PHONE_DISPLAY_W + 72;

const PRIVACY_CONSENT = JSON.stringify({
  version: "2025-06-02",
  acceptedAt: new Date().toISOString(),
});

const IFRAME_ID = "trassa-app-frame";
const INSTRUCTION_LOGO_PATH = path.join(root, "public", "videos", "instruction-brand-logo.png");
const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(INSTRUCTION_LOGO_PATH).toString("base64")}`;

/** Т-бот для финального экрана (упрощённый SVG из TBotMascot). */
const TBOT_OUTRO_SVG = `<div id="trassa-outro-tbot" class="trassa-outro-tbot" aria-hidden="true">
  <svg class="trassa-outro-tbot__svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="trassa-outro-tbot-grad" x1="12" y1="18" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <g class="trassa-outro-tbot__antenna">
      <line x1="32" y1="14" x2="32" y2="7" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="4.5" r="4" fill="#f472b6" stroke="#fda4af" stroke-width="1.5"/>
    </g>
    <rect x="10" y="16" width="44" height="40" rx="12" fill="url(#trassa-outro-tbot-grad)" stroke="#22d3ee" stroke-width="2"/>
    <rect x="18" y="38" width="28" height="14" rx="4" fill="#22d3ee" opacity="0.38"/>
    <text x="32" y="48.5" text-anchor="middle" fill="#f8fafc" font-size="11" font-weight="800" font-family="Segoe UI, system-ui, sans-serif">Т</text>
    <ellipse class="trassa-outro-tbot__eye trassa-outro-tbot__eye--left" cx="24" cy="30" rx="4" ry="4" fill="#fef08a"/>
    <ellipse class="trassa-outro-tbot__eye trassa-outro-tbot__eye--right" cx="40" cy="30" rx="4" ry="4" fill="#fef08a"/>
    <rect class="trassa-outro-tbot__mouth" x="24" y="52" width="16" height="5" rx="2" fill="#fbbf24" opacity="0.95"/>
    <rect x="6" y="22" width="4" height="10" rx="2" fill="#64748b"/>
    <rect x="54" y="22" width="4" height="10" rx="2" fill="#64748b"/>
  </svg>
</div>`;

const RECORD_IFRAME_FIT_STYLE_ID = "trassa-record-iframe-fit";

/** Убираем legacy neo-рамку (#root padding + тёмный rim) в кабинетах при записи в iframe. */
const CABINET_ROUTE_FIX_CSS = `
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
    min-height: 100svh !important;
    min-height: 100dvh !important;
    overflow: visible !important;
  }
  body.route-cabinet .app-shell, body.route-profile .app-shell, body.route-page4 .app-shell {
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    min-height: 100svh !important;
    min-height: 100dvh !important;
  }
  body.route-cabinet .app-shell__bgFill, body.route-profile .app-shell__bgFill {
    background-color: #f8fafc !important;
    background-image: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%) !important;
  }
  body.route-page2 #root {
    padding: 0 !important;
    box-shadow: none !important;
  }
  body.route-page2 .app-shell {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  html[data-portal-design="v2"] [aria-label="Чат с Т-ботом"].floating-widget-v2__panel {
    left: 50% !important;
    top: 50% !important;
    right: auto !important;
    transform: translate(-50%, -50%) !important;
    width: min(400px, calc(100vw - 20px)) !important;
    max-width: calc(100vw - 20px) !important;
    max-height: min(520px, calc(100vh - 24px)) !important;
  }
`;

const TBOT_MOCK_REPLY =
  "Откройте раздел «Формы», выберите назначенную таблицу РАДОР и заполните обязательные ячейки — процент заполнения отображается в KPI на главной.";

/** Скрываем полосу прокрутки — иначе clientWidth 375 при viewport 390 и белая полоса справа. */
const RECORD_IFRAME_FIT_CSS = `
  html, body, #root {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100% !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    scrollbar-gutter: auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box;
  }
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  html[data-portal-design="v2"] .cabinet-chrome--v2.cabinet-v2-scene,
  html[data-portal-design="v2"] .page5-chrome.cabinet-v2-scene {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100% !important;
    min-height: 100dvh !important;
    box-sizing: border-box;
  }
  html[data-portal-design="v2"] .cabinet-v2-body,
  html[data-portal-design="v2"] .cabinet-v2-dashboard-stage,
  html[data-portal-design="v2"] .page4-v2__main-region,
  html[data-portal-design="v2"] .page5-v2__main-region,
  html[data-portal-design="v2"] .cabinet-chrome--v2,
  html[data-portal-design="v2"] .cabinet-v2-layout,
  html[data-portal-design="v2"] .cabinet-v2-layout.pv2-layout {
    scrollbar-gutter: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box;
  }
  html[data-portal-design="v2"].route-page4 .page4-v2__main-region,
  html[data-portal-design="v2"] .page4-v2__main-region.page4-v2-dashboard__panel {
    overflow-y: visible !important;
    overflow-x: hidden !important;
    min-height: 0 !important;
    max-height: none !important;
    height: auto !important;
  }
${CABINET_ROUTE_FIX_CSS}
`;

const IFRAME_VIEWPORT_FIX = (mobileW) => {
  if (window.self === window.top) return;

  const fitStyleId = "trassa-record-iframe-fit";
  const fitCss = `
  html, body, #root {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100% !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    scrollbar-gutter: auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box;
  }
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  html[data-portal-design="v2"] .cabinet-chrome--v2.cabinet-v2-scene,
  html[data-portal-design="v2"] .page5-chrome.cabinet-v2-scene {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100% !important;
    min-height: 100dvh !important;
    box-sizing: border-box;
  }
  html[data-portal-design="v2"] .cabinet-v2-body,
  html[data-portal-design="v2"] .page4-v2__main-region,
  html[data-portal-design="v2"] .cabinet-v2-layout,
  html[data-portal-design="v2"] .cabinet-v2-layout.pv2-layout {
    scrollbar-gutter: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box;
  }
  html[data-portal-design="v2"].route-page4 .page4-v2__main-region {
    overflow-y: visible !important;
    min-height: 0 !important;
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

  const apply = () => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.prepend(meta);
    }
    meta.setAttribute(
      "content",
      `width=${mobileW}, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
    );
    document.documentElement.style.overflowX = "hidden";
    if (document.body) document.body.style.overflowX = "hidden";

    let style = document.getElementById(fitStyleId);
    if (!style) {
      style = document.createElement("style");
      style.id = fitStyleId;
      document.head.appendChild(style);
    }
    style.textContent = fitCss;
  };

  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  }
};

const INTRO_BULLETS = [
  "Главная страница и интерактивная карта подрядчиков",
  "Вход в портал и выбор роли пользователя",
  "Мобильный кабинет студента: заявки и портфолио",
  "Кабинет подрядчика: KPI, формы, планнер, чат и Т-бот",
];

const CONTRACTOR_KPI_STEPS = [
  {
    label: /событий в календаре/i,
    tip: "«Событий в календаре» — ближайшие мероприятия для студентов и школьников",
  },
  {
    label: /уведомления по формам/i,
    tip: "«Уведомления по формам» — новые сообщения по назначенным таблицам",
  },
  {
    label: /подборки студентов/i,
    tip: "«Подборки студентов» — рекомендации от администратора программы",
  },
  {
    label: /документы/i,
    tip: "«Документы» — быстрый переход к письмам и файлам от РАДОР",
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const TIP_READ_BASE_MS = 1300;
const TIP_READ_CHAR_MS = 30;
const TIP_READ_MAX_MS = 4000;

function tipReadMs(tip) {
  if (!tip) return 400;
  return Math.min(TIP_READ_MAX_MS, TIP_READ_BASE_MS + String(tip).length * TIP_READ_CHAR_MS);
}

async function pauseForTipRead(tip) {
  await sleep(tipReadMs(tip));
}

/** Таймкоды для диктора (секунды от начала записи). */
const narrationCues = [];
let elapsed = () => 0;

function markNarration(text) {
  if (!NARRATION_ENABLED) return;
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return;
  narrationCues.push({ startSec: elapsed(), text: t });
}

function narrationLine(...parts) {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function muxNarrationTrack(videoPath, cuesPath) {
  if (!NARRATION_ENABLED || narrationCues.length === 0) return videoPath;
  writeFileSync(cuesPath, JSON.stringify(narrationCues, null, 2), "utf8");
  console.log(`\nNarration: ${narrationCues.length} cues → ${cuesPath}`);

  const pyScript = path.join(__dirname, "instruction-narrator.py");
  const tmpOut = path.join(outDir, "mobile-instruction-narrated.tmp.mp4");
  const r = spawnSync(process.env.PYTHON || "python", [pyScript, cuesPath, videoPath, tmpOut], {
    stdio: "inherit",
    cwd: root,
  });
  if (r.status !== 0) {
    console.warn("Narration mux failed — video without voice saved.");
    return videoPath;
  }
  try {
    const silentBackup = path.join(outDir, "mobile-instruction-silent.mp4");
    if (videoPath.endsWith("mobile-instruction.mp4")) {
      try {
        copyFileSync(videoPath, silentBackup);
      } catch {
        /* ignore */
      }
    }
    renameSync(tmpOut, videoPath);
    console.log(`✓ Narrator voice added: ${videoPath}`);
  } catch {
    const alt = path.join(outDir, "mobile-instruction-narrated.mp4");
    renameSync(tmpOut, alt);
    console.log(`✓ Narrator voice: ${alt}`);
    return alt;
  }
  return videoPath;
}

function appFrame(page) {
  return page.frameLocator(`#${IFRAME_ID}`);
}

const HIGHLIGHT_INIT = () => {
  /* подсветка только кольцом на оболочке записи — без outline внутри iframe */
};

const SHELL_INIT = ({
  scale,
  presentW,
  presentH,
  phoneW,
  phoneH,
  phoneLeft,
  phoneDisplayW,
  phoneDisplayH,
  copyLeft,
}) => {
  if (window.__trassaShellReady) return;
  window.__trassaShellReady = true;

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${presentW}px;
      height: ${presentH}px;
      overflow: hidden;
      cursor: none !important;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    #trassa-present-root {
      position: relative;
      width: 100%;
      height: 100%;
      background: #f3f5fa;
    }
    #trassa-neutral-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      background: linear-gradient(165deg, #ffffff 0%, #f7f8fc 52%, #eef2ff 100%);
    }
    .trassa-blob {
      position: absolute;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(42px);
      will-change: transform;
    }
    .trassa-blob--1 {
      width: 560px;
      height: 560px;
      left: -10%;
      top: 6%;
      background: radial-gradient(circle, rgba(43, 100, 253, 0.24) 0%, transparent 68%);
      animation: trassa-blob-a 22s ease-in-out infinite;
    }
    .trassa-blob--2 {
      width: 480px;
      height: 480px;
      right: -6%;
      bottom: 4%;
      background: radial-gradient(circle, rgba(90, 134, 253, 0.2) 0%, transparent 66%);
      animation: trassa-blob-b 26s ease-in-out infinite;
    }
    .trassa-blob--3 {
      width: 400px;
      height: 400px;
      left: 38%;
      top: -8%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, transparent 62%);
      animation: trassa-blob-c 19s ease-in-out infinite;
    }
    @keyframes trassa-blob-a {
      0%, 100% { transform: translate(0, 0) scale(1); }
      40% { transform: translate(36px, -24px) scale(1.08); }
      70% { transform: translate(-18px, 30px) scale(0.94); }
    }
    @keyframes trassa-blob-b {
      0%, 100% { transform: translate(0, 0) scale(1); }
      35% { transform: translate(-32px, 20px) scale(1.06); }
      65% { transform: translate(24px, -28px) scale(0.97); }
    }
    @keyframes trassa-blob-c {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(20px, 32px) scale(1.1); }
    }

    #trassa-intro-scene,
    #trassa-outro-scene {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 120px;
      text-align: center;
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    #trassa-outro-scene {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.98);
    }
    #trassa-outro-scene.is-visible {
      opacity: 1;
      transform: scale(1);
    }
    #trassa-intro-scene.is-hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(1.02);
    }
    #trassa-intro-logo,
    .trassa-outro-logo,
    .trassa-brand-logo {
      width: 72px;
      height: 72px;
      margin-bottom: 28px;
      border-radius: 20px;
      object-fit: cover;
      box-shadow: 0 16px 40px rgba(43, 100, 253, 0.24);
      display: block;
    }
    #trassa-intro-title,
    #trassa-outro-title {
      margin: 0 0 18px;
      font-size: 56px;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1.08;
      color: #0f172a;
      max-width: 980px;
      opacity: 0;
      transform: translateY(18px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    #trassa-intro-title.is-visible,
    #trassa-outro-title.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    #trassa-intro-lead,
    #trassa-outro-lead {
      margin: 0 0 36px;
      font-size: 26px;
      line-height: 1.5;
      color: rgba(15,23,42,0.72);
      font-weight: 500;
      max-width: 820px;
      opacity: 0;
      transform: translateY(14px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    #trassa-intro-lead.is-visible,
    #trassa-outro-lead.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .trassa-outro-tbot {
      width: 128px;
      height: 128px;
      margin-bottom: 26px;
      opacity: 0;
      transform: translateY(16px) scale(0.9);
      transition: opacity 0.55s ease 0.05s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s;
      filter: drop-shadow(0 16px 36px rgba(43, 100, 253, 0.28));
    }
    #trassa-outro-scene.is-visible .trassa-outro-tbot {
      opacity: 1;
      transform: translateY(0) scale(1);
      animation: trassa-outro-tbot-float 2.8s ease-in-out 0.5s infinite;
    }
    .trassa-outro-tbot__svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .trassa-outro-tbot__antenna {
      transform-origin: 32px 9px;
      animation: trassa-outro-tbot-antenna 2.1s ease-in-out 0.8s infinite;
    }
    .trassa-outro-tbot__eye {
      transform-origin: center;
      transform-box: fill-box;
    }
    .trassa-outro-tbot__eye--left {
      animation: trassa-outro-tbot-blink-left 4.5s ease-in-out 1.2s infinite;
    }
    .trassa-outro-tbot__eye--right {
      animation: trassa-outro-tbot-blink-right 4.5s ease-in-out 1.2s infinite;
    }
    .trassa-outro-tbot.is-winking .trassa-outro-tbot__eye--right {
      animation: trassa-outro-tbot-wink 1.1s ease-in-out 0s 2;
    }
    .trassa-outro-tbot.is-winking .trassa-outro-tbot__mouth {
      animation: trassa-outro-tbot-smile 1.1s ease-in-out 0s 2;
    }
    @keyframes trassa-outro-tbot-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-6px) scale(1.02); }
    }
    @keyframes trassa-outro-tbot-antenna {
      0%, 100% { transform: rotate(-8deg); }
      50% { transform: rotate(8deg); }
    }
    @keyframes trassa-outro-tbot-blink-left {
      0%, 46%, 50%, 100% { transform: scaleY(1); }
      48% { transform: scaleY(0.12); }
    }
    @keyframes trassa-outro-tbot-blink-right {
      0%, 88%, 92%, 100% { transform: scaleY(1); }
      90% { transform: scaleY(0.12); }
    }
    @keyframes trassa-outro-tbot-wink {
      0%, 100% { transform: scaleY(1); }
      18%, 42% { transform: scaleY(0.1); }
    }
    @keyframes trassa-outro-tbot-smile {
      0%, 100% { transform: scaleX(1); }
      18%, 42% { transform: scaleX(1.14); }
    }

    #trassa-intro-bullets {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 760px;
      width: 100%;
      text-align: left;
    }
    #trassa-intro-bullets li {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 20px;
      border-radius: 16px;
      background: rgba(255,255,255,0.78);
      border: 1px solid rgba(59,130,246,0.14);
      box-shadow: 0 8px 24px rgba(15,23,42,0.06);
      font-size: 20px;
      line-height: 1.45;
      color: #1e293b;
      font-weight: 600;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.48s ease, transform 0.48s ease;
    }
    #trassa-intro-bullets li.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    #trassa-intro-bullets li::before {
      content: "✓";
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(145deg, #3b82f6, #2563eb);
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }
    #trassa-intro-handoff {
      margin-top: 32px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(37,99,235,0.75);
      opacity: 0;
      transition: opacity 0.45s ease;
    }
    #trassa-intro-handoff.is-visible { opacity: 1; }

    #trassa-demo-scene {
      position: absolute;
      inset: 0;
      z-index: 5;
      opacity: 0;
      pointer-events: none;
    }
    #trassa-demo-scene.is-visible {
      opacity: 1;
      pointer-events: auto;
    }
    #trassa-phone-wrap {
      position: absolute;
      top: 50%;
      width: ${phoneDisplayW}px;
      height: ${phoneDisplayH}px;
      opacity: 0;
      z-index: 2;
      transition:
        opacity 0.65s ease,
        left 0.92s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.92s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #trassa-demo-scene.is-phone-centered #trassa-phone-wrap {
      left: 50%;
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    #trassa-demo-scene.is-phone-left #trassa-phone-wrap {
      left: ${phoneLeft}px;
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
    #trassa-phone-shell {
      position: relative;
      width: ${phoneW}px;
      height: ${phoneH}px;
      transform: scale(${scale});
      transform-origin: top left;
      border-radius: 38px;
      overflow: hidden;
      background: #0a0f18;
      box-shadow:
        0 0 0 10px #1e293b,
        0 0 0 12px rgba(255,255,255,0.5),
        0 32px 80px rgba(15,23,42,0.28),
        inset 0 1px 0 rgba(255,255,255,0.12);
      isolation: isolate;
    }
    #trassa-phone-shell::before {
      content: "";
      position: absolute;
      top: 11px;
      left: 50%;
      transform: translateX(-50%);
      width: 92px;
      height: 24px;
      border-radius: 999px;
      background: rgba(0,0,0,0.55);
      z-index: 5;
      pointer-events: none;
    }
    #trassa-phone-fade {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      opacity: 0;
      z-index: 8;
      pointer-events: none;
      transition: opacity 0.38s ease;
    }
    #trassa-phone-fade.is-active { opacity: 1; }
    #trassa-phone-screen {
      position: absolute;
      inset: 0;
      overflow: hidden;
      border-radius: 38px;
      background: #f1f5f9;
    }
    #trassa-app-frame {
      position: absolute;
      top: 0;
      left: 0;
      width: ${phoneW}px;
      height: ${phoneH}px;
      border: none;
      display: block;
      background: #f1f5f9;
      transform-origin: top left;
    }
    #trassa-demo-ring {
      position: fixed;
      z-index: 150;
      pointer-events: none;
      border: 3px solid rgba(43, 100, 253, 0.95);
      border-radius: 14px;
      box-shadow:
        0 0 0 6px rgba(43, 100, 253, 0.2),
        0 0 24px rgba(43, 100, 253, 0.4);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.16s ease;
    }
    #trassa-demo-ring.is-jumping {
      transition: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
    #trassa-demo-ring.is-visible {
      opacity: 1;
      visibility: visible;
      animation: trassa-ring-pulse 1.6s ease-in-out infinite;
    }
    @keyframes trassa-ring-pulse {
      0%, 100% { box-shadow: 0 0 0 6px rgba(43, 100, 253, 0.2), 0 0 24px rgba(43, 100, 253, 0.4); }
      50% { box-shadow: 0 0 0 9px rgba(43, 100, 253, 0.32), 0 0 36px rgba(43, 100, 253, 0.55); }
    }
    #trassa-present-copy {
      position: absolute;
      left: ${copyLeft}px;
      right: 56px;
      top: 50%;
      transform: translateY(-50%) translateX(28px);
      color: #0f172a;
      z-index: 3;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 0.62s ease 0.18s,
        transform 0.72s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
        visibility 0s linear 0.62s;
    }
    #trassa-demo-scene.is-phone-centered #trassa-present-copy {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    #trassa-demo-scene.is-phone-left.is-copy-visible #trassa-present-copy {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(0);
      pointer-events: auto;
      transition:
        opacity 0.62s ease 0.18s,
        transform 0.72s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
        visibility 0s linear 0s;
    }
    #trassa-demo-scene.is-phone-centered #trassa-demo-progress {
      opacity: 0;
    }
    #trassa-present-kicker {
      display: inline-block;
      margin-bottom: 18px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #2563eb;
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.22);
    }
    #trassa-present-headline {
      margin: 0 0 20px;
      font-size: 48px;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: #0f172a;
    }
    #trassa-present-body {
      margin: 0 0 22px;
      font-size: 21px;
      line-height: 1.55;
      color: rgba(15,23,42,0.78);
      font-weight: 500;
      max-width: 720px;
    }
    #trassa-present-tip {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px 20px;
      border-radius: 16px;
      border: 1px solid rgba(59,130,246,0.2);
      background: rgba(255,255,255,0.72);
      font-size: 17px;
      line-height: 1.48;
      color: rgba(30,41,59,0.92);
      max-width: 720px;
    }
    #trassa-present-tip[hidden] {
      display: none !important;
    }
    #trassa-present-tip::before {
      content: "●";
      flex-shrink: 0;
      font-size: 10px;
      line-height: 1.8;
      color: #3b82f6;
    }
    #trassa-present-brand {
      position: absolute;
      bottom: -52px;
      left: 0;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.28);
    }
    #trassa-demo-layer {
      position: fixed;
      inset: 0;
      z-index: 100;
      pointer-events: none;
    }
    #trassa-demo-progress {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: rgba(15,23,42,0.06);
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #trassa-demo-scene.is-phone-left #trassa-demo-progress {
      opacity: 1;
    }
    #trassa-demo-progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
      transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #trassa-demo-cursor {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 260;
      pointer-events: none;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));
      will-change: transform;
      opacity: 0;
      transition: opacity 0.35s ease;
    }
    #trassa-demo-scene.is-visible #trassa-demo-cursor,
    #trassa-demo-cursor.is-visible {
      opacity: 1;
    }
    #trassa-demo-cursor svg {
      width: 36px;
      height: 36px;
      transform: translate(-4px, -2px);
    }
    #trassa-demo-cursor-ripple {
      position: absolute;
      left: 10px;
      top: 10px;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border-radius: 50%;
      border: 2.5px solid rgba(255,255,255,0.95);
      opacity: 0;
    }
    #trassa-demo-cursor-ripple.is-active {
      animation: trassa-ripple 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    @keyframes trassa-ripple {
      0% { opacity: 0.95; transform: scale(0.35); }
      100% { opacity: 0; transform: scale(2.6); }
    }
    #trassa-demo-cursor.is-clicking svg {
      animation: trassa-tap 0.22s ease;
    }
    @keyframes trassa-tap {
      50% { transform: translate(-2px, 0) scale(0.88); }
    }
  `;
  document.head.appendChild(style);

  const layer = document.createElement("div");
  layer.id = "trassa-demo-layer";
  layer.innerHTML = `
    <div id="trassa-demo-progress"><div id="trassa-demo-progress-fill"></div></div>
    <div id="trassa-demo-ring" aria-hidden="true"></div>
    <div id="trassa-demo-cursor">
      <svg viewBox="0 0 24 24"><path fill="#fff" stroke="#0f172a" stroke-width="1.2" d="M5 3l14 9.5-6.2 1.4L10 21 5 3z"/></svg>
      <div id="trassa-demo-cursor-ripple"></div>
    </div>
  `;
  document.body.appendChild(layer);

  const cursor = document.getElementById("trassa-demo-cursor");
  const ripple = document.getElementById("trassa-demo-cursor-ripple");
  let pos = { x: 160, y: 420 };
  let moveToken = 0;

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const applyPos = (x, y) => {
    pos = { x, y };
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  applyPos(pos.x, pos.y);

  const resolveRingRadius = (w, h, borderRadiusRaw) => {
    const minDim = Math.min(w, h);
    if (minDim < 6) return "8px";
    const parts = String(borderRadiusRaw || "14px")
      .split(/[\/\s]+/)
      .filter(Boolean);
    let maxR = 0;
    for (const p of parts) {
      const v = p.trim();
      if (v.endsWith("%")) maxR = Math.max(maxR, (parseFloat(v) / 100) * minDim);
      else maxR = Math.max(maxR, parseFloat(v) || 0);
    }
    const ratio = w / Math.max(h, 1);
    const isSquarish = ratio > 0.72 && ratio < 1.38;
    if (maxR >= minDim * 0.42 || (isSquarish && maxR >= minDim * 0.22)) {
      return "50%";
    }
    const pad = Math.max(3, Math.min(7, minDim * 0.05));
    return `${Math.min(maxR + pad, minDim / 2)}px`;
  };

  window.__trassaDemo = {
    moveTo(x, y, duration = 850) {
      const token = ++moveToken;
      const from = { ...pos };
      const start = performance.now();
      return new Promise((resolve) => {
        const tick = (now) => {
          if (token !== moveToken) return resolve();
          const t = Math.min(1, (now - start) / duration);
          applyPos(from.x + (x - from.x) * easeInOutCubic(t), from.y + (y - from.y) * easeInOutCubic(t));
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    async clickAnim() {
      cursor.classList.add("is-clicking");
      ripple.classList.remove("is-active");
      void ripple.offsetWidth;
      ripple.classList.add("is-active");
      await new Promise((r) => setTimeout(r, 300));
      cursor.classList.remove("is-clicking");
    },
    showCursor() {
      cursor?.classList.add("is-visible");
    },
    hideCursor() {
      cursor?.classList.remove("is-visible");
    },
    showRing(box) {
      const ring = document.getElementById("trassa-demo-ring");
      if (!ring || !box) return;
      const pad = Math.max(4, Math.min(8, Math.min(box.width, box.height) * 0.06));
      ring.classList.remove("is-visible");
      ring.classList.add("is-jumping");
      ring.style.left = `${box.x - pad}px`;
      ring.style.top = `${box.y - pad}px`;
      ring.style.width = `${box.width + pad * 2}px`;
      ring.style.height = `${box.height + pad * 2}px`;
      ring.style.borderRadius = resolveRingRadius(
        box.width + pad * 2,
        box.height + pad * 2,
        box.borderRadius
      );
      void ring.offsetWidth;
      ring.classList.remove("is-jumping");
      ring.classList.add("is-visible");
    },
    hideRing() {
      const ring = document.getElementById("trassa-demo-ring");
      if (!ring) return;
      ring.classList.remove("is-visible");
      ring.classList.add("is-jumping");
      void ring.offsetWidth;
      ring.classList.remove("is-jumping");
    },
    setCopy(step, title, body, tip) {
      document.getElementById("trassa-present-kicker").textContent = step;
      document.getElementById("trassa-present-headline").textContent = title;
      document.getElementById("trassa-present-body").textContent = body;
      this.setCopyTip(tip);
      const demo = document.getElementById("trassa-demo-scene");
      if (demo?.classList.contains("is-phone-left")) {
        demo.classList.add("is-copy-visible");
        document.getElementById("trassa-present-copy")?.setAttribute("aria-hidden", "false");
      }
    },
    setCopyTip(tip) {
      const tipEl = document.getElementById("trassa-present-tip");
      if (!tipEl) return;
      if (!tip) {
        tipEl.textContent = "";
        tipEl.hidden = true;
        return;
      }
      tipEl.hidden = false;
      tipEl.textContent = tip;
    },
    setProgress(pct) {
      document.getElementById("trassa-demo-progress-fill").style.width = `${Math.max(0, Math.min(100, pct))}%`;
    },
    async phoneFade(active) {
      document.getElementById("trassa-phone-fade")?.classList.toggle("is-active", active);
      await new Promise((r) => setTimeout(r, active ? 380 : 420));
    },
    revealIntroPart(id) {
      document.getElementById(id)?.classList.add("is-visible");
    },
    revealIntroBullet(index) {
      document.querySelectorAll("#trassa-intro-bullets li")[index]?.classList.add("is-visible");
    },
    async beginCenteredPhoneIntro() {
      document.getElementById("trassa-intro-scene")?.classList.add("is-hidden");
      const demo = document.getElementById("trassa-demo-scene");
      demo?.classList.remove("is-copy-visible", "is-phone-left");
      demo?.classList.add("is-visible", "is-phone-centered");
      await new Promise((r) => setTimeout(r, 500));
    },
    async expandPhoneLayout() {
      const demo = document.getElementById("trassa-demo-scene");
      demo?.classList.remove("is-phone-centered", "is-copy-visible");
      demo?.classList.add("is-phone-left");
      cursor?.classList.add("is-visible");
      await new Promise((r) => setTimeout(r, 980));
    },
    async showOutro(title, lead) {
      document.getElementById("trassa-demo-scene")?.classList.remove("is-visible");
      document.getElementById("trassa-demo-ring")?.classList.remove("is-visible");
      const outro = document.getElementById("trassa-outro-scene");
      const tbot = document.getElementById("trassa-outro-tbot");
      document.getElementById("trassa-outro-title").textContent = title;
      document.getElementById("trassa-outro-lead").textContent = lead;
      tbot?.classList.remove("is-winking");
      outro?.classList.add("is-visible");
      await new Promise((r) => setTimeout(r, 200));
      document.getElementById("trassa-outro-title")?.classList.add("is-visible");
      await new Promise((r) => setTimeout(r, 550));
      document.getElementById("trassa-outro-lead")?.classList.add("is-visible");
      await new Promise((r) => setTimeout(r, 850));
      tbot?.classList.add("is-winking");
    },
  };
};

const buildShellHtml = (logoSrc) => `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Trassa instruction</title></head>
<body>
  <div id="trassa-present-root">
    <div id="trassa-neutral-bg" aria-hidden="true">
      <div class="trassa-blob trassa-blob--1"></div>
      <div class="trassa-blob trassa-blob--2"></div>
      <div class="trassa-blob trassa-blob--3"></div>
    </div>

    <section id="trassa-intro-scene" aria-label="Вступление">
      <img class="trassa-brand-logo" src="${logoSrc}" alt="ТрассА" />
      <h1 id="trassa-intro-title">Добро пожаловать в портал ТрассА</h1>
      <p id="trassa-intro-lead">Мы познакомим вас с ключевыми возможностями цифрового портала</p>
      <ul id="trassa-intro-bullets">
        ${INTRO_BULLETS.map((b) => `<li>${b}</li>`).join("\n        ")}
      </ul>
      <p id="trassa-intro-handoff">Смотрим на смартфон →</p>
    </section>

    <section id="trassa-outro-scene" aria-label="Завершение">
      ${TBOT_OUTRO_SVG}
      <h1 id="trassa-outro-title">Удачной работы в нашем портале!</h1>
      <p id="trassa-outro-lead">ТрассА · цифровой портал для студентов, школ и подрядчиков</p>
    </section>

    <div id="trassa-demo-scene">
      <div id="trassa-phone-wrap">
        <div id="trassa-phone-shell">
          <div id="trassa-phone-fade" aria-hidden="true"></div>
          <div id="trassa-phone-screen">
            <iframe id="${IFRAME_ID}" title="ТрассА" width="${PHONE_W}" height="${PHONE_H}"></iframe>
          </div>
        </div>
      </div>
      <aside id="trassa-present-copy" aria-hidden="true">
        <p id="trassa-present-kicker"></p>
        <h2 id="trassa-present-headline"></h2>
        <p id="trassa-present-body"></p>
        <div id="trassa-present-tip"></div>
        <div id="trassa-present-brand">ТрассА · цифровой портал</div>
      </aside>
    </div>
  </div>
</body>
</html>`;

async function prepareContext(context) {
  await context.route("**/api/tbot/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        configured: true,
        provider: "openrouter",
        providerLabel: "OpenRouter",
        model: "meta-llama/llama-3.3-70b-instruct:free",
        proxyConfigured: false,
      }),
    });
  });

  await context.route("**/api/tbot/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, reply: TBOT_MOCK_REPLY }),
    });
  });

  await context.addInitScript((consentJson) => {
    try {
      localStorage.setItem("trassa-portal-design", "v2");
      localStorage.setItem("trassa-cabinet-theme", "light");
      localStorage.setItem("_p_pc_v1", consentJson);
      sessionStorage.setItem("_p_pc_v1", consentJson);
      sessionStorage.removeItem("trassa-ai-bubble-pos");
      sessionStorage.removeItem("trassa-ai-panel-pos");
      document.documentElement.dataset.portalDesign = "v2";
      document.documentElement.dataset.cabinetTheme = "light";
    } catch {
      /* ignore */
    }
  }, PRIVACY_CONSENT);
  await context.addInitScript(HIGHLIGHT_INIT);
  await context.addInitScript(IFRAME_VIEWPORT_FIX, PHONE_W);

  const mobileViewportTag = `<meta name="viewport" content="width=${PHONE_W}, initial-scale=1, maximum-scale=1, viewport-fit=cover">`;
  await context.route(`${base}/**`, async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }
    try {
      const response = await route.fetch();
      const ct = response.headers()["content-type"] || "";
      if (!ct.includes("text/html")) {
        await route.fulfill({ response });
        return;
      }
      let body = await response.text();
      if (/<meta[^>]+name=["']viewport["']/i.test(body)) {
        body = body.replace(/<meta[^>]+name=["']viewport["'][^>]*>/i, mobileViewportTag);
      } else if (body.includes("</head>")) {
        body = body.replace("</head>", `${mobileViewportTag}\n</head>`);
      }
      await route.fulfill({ response, body });
    } catch {
      await route.continue();
    }
  });
}

/** Viewport 390px + без полосы прокрутки (иначе контент 375px и зазор справа в мокапе). */
async function syncPhoneScreenBackground(page) {
  const bg = await appFrame(page)
    .locator("body")
    .evaluate(() => {
      const scene = document.querySelector(".cabinet-v2-scene, .page5-chrome, .pv2-scene");
      const source = scene ?? document.body;
      const color = getComputedStyle(source).backgroundColor;
      return color && color !== "rgba(0, 0, 0, 0)" ? color : getComputedStyle(document.body).backgroundColor;
    })
    .catch(() => "#f1f5f9");

  await page.evaluate(
    ({ iframeId, bg }) => {
      const iframe = document.getElementById(iframeId);
      const screen = document.getElementById("trassa-phone-screen");
      if (iframe) iframe.style.background = bg;
      if (screen) screen.style.background = bg;
    },
    { iframeId: IFRAME_ID, bg }
  );
}

async function fixIframeViewport(page) {
  const app = appFrame(page);
  await app.locator("html").evaluate(
    (mobileW, fitStyleId, fitCss) => {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.prepend(meta);
      }
      meta.setAttribute(
        "content",
        `width=${mobileW}, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
      );
      document.documentElement.style.transform = "";
      document.documentElement.style.width = "";
      document.documentElement.style.minWidth = "";
      document.documentElement.style.maxWidth = "";
      document.documentElement.style.overflowX = "hidden";
      if (document.body) {
        document.body.style.transform = "";
        document.body.style.width = "";
        document.body.style.minWidth = "";
        document.body.style.maxWidth = "";
        document.body.style.overflowX = "hidden";
      }

      let style = document.getElementById(fitStyleId);
      if (!style) {
        style = document.createElement("style");
        style.id = fitStyleId;
        document.head.appendChild(style);
      }
      style.textContent = fitCss;
    },
    PHONE_W,
    RECORD_IFRAME_FIT_STYLE_ID,
    RECORD_IFRAME_FIT_CSS
  );

  await sleep(120);

  await app.locator("html").evaluate((mobileW, mobileH) => {
    document.documentElement.style.minHeight = `${mobileH}px`;
    if (document.body) document.body.style.minHeight = `${mobileH}px`;

    const contentW = Math.max(
      document.documentElement.scrollWidth || 0,
      document.documentElement.clientWidth || 0,
      document.body?.scrollWidth || 0,
      window.innerWidth || 0
    );
    document.documentElement.style.transform = "";
    document.documentElement.style.transformOrigin = "";
    document.documentElement.style.width = "";
    if (contentW > 0 && contentW < mobileW - 0.5) {
      const fill = mobileW / contentW;
      document.documentElement.style.width = `${contentW}px`;
      document.documentElement.style.transform = `scale(${fill})`;
      document.documentElement.style.transformOrigin = "top left";
      if (document.body) {
        document.body.style.minHeight = `${Math.ceil(mobileH / fill)}px`;
      }
    }
  }, PHONE_W, PHONE_H);

  await sleep(80);

  await page.evaluate(
    ({ iframeId, mobileW, mobileH }) => {
      const iframe = document.getElementById(iframeId);
      if (!iframe) return;
      iframe.style.width = `${mobileW}px`;
      iframe.style.height = `${mobileH}px`;
      iframe.style.transform = "none";
    },
    { iframeId: IFRAME_ID, mobileW: PHONE_W, mobileH: PHONE_H }
  );

  await syncPhoneScreenBackground(page);

  await app.locator("html").evaluate(() => window.dispatchEvent(new Event("resize")));
  await sleep(120);
}

async function openShell(page) {
  await page.setContent(buildShellHtml(LOGO_DATA_URI), { waitUntil: "domcontentloaded" });
  await page.evaluate(SHELL_INIT, {
    scale: PHONE_SCALE,
    presentW: PRESENT_W,
    presentH: PRESENT_H,
    phoneW: PHONE_W,
    phoneH: PHONE_H,
    phoneLeft: PHONE_LEFT,
    phoneDisplayW: PHONE_DISPLAY_W,
    phoneDisplayH: PHONE_DISPLAY_H,
    copyLeft: COPY_LEFT,
  });
}

async function playIntroSequence(page) {
  markNarration("Добро пожаловать в портал ТрассА");
  await sleep(600);
  await page.evaluate(() => window.__trassaDemo?.revealIntroPart("trassa-intro-title"));
  await sleep(2200);
  markNarration("Мы познакомим вас с ключевыми возможностями цифрового портала");
  await page.evaluate(() => window.__trassaDemo?.revealIntroPart("trassa-intro-lead"));
  await sleep(1200);
  for (let i = 0; i < INTRO_BULLETS.length; i++) {
    markNarration(INTRO_BULLETS[i]);
    await page.evaluate((idx) => window.__trassaDemo?.revealIntroBullet(idx), i);
    await sleep(850);
  }
  markNarration("Смотрим приложение на смартфоне");
  await page.evaluate(() => window.__trassaDemo?.revealIntroPart("trassa-intro-handoff"));
  await sleep(1500);
  await page.evaluate(() => window.__trassaDemo?.beginCenteredPhoneIntro());
}

async function loadAppInPhone(page, hashPath = "/") {
  const url = `${base}/#${hashPath.startsWith("/") ? hashPath : `/${hashPath}`}`;
  await page.evaluate(
    ({ iframeId, url: u }) => {
      document.getElementById(iframeId).src = u;
    },
    { iframeId: IFRAME_ID, url }
  );
}

/** Ждём entry-splash в телефоне (анимация загрузки), затем главную. */
async function waitForEntrySplashComplete(page) {
  const app = appFrame(page);
  await app.locator("body").waitFor({ state: "attached", timeout: 90000 });
  await app.locator(".entry-splash").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await app.locator(".entry-splash").waitFor({ state: "hidden", timeout: 35000 });
  await sleep(500);
  const btn = app.getByRole("button", { name: /^понятно$/i });
  if (await btn.count()) await btn.first().click({ timeout: 3000 }).catch(() => {});
  await app.locator("body").evaluate(() => {
    sessionStorage.setItem("trassa_intro_done", "1");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.dataset.cabinetTheme = "light";
  });
  await fixIframeViewport(page);
  await sleep(400);
}

async function expandPhoneToDemoLayout(page) {
  await page.evaluate(() => window.__trassaDemo?.expandPhoneLayout());
}

async function waitForHomePage(page) {
  const app = appFrame(page);
  await app
    .getByRole("button", { name: /перейти в управление/i })
    .first()
    .waitFor({ state: "visible", timeout: 30000 })
    .catch(() => {});
  await fixIframeViewport(page).catch(() => {});
  await syncPhoneScreenBackground(page).catch(() => {});
}

async function playOutro(page) {
  markNarration(
    "Удачной работы в нашем портале! ТрассА — цифровой портал для студентов, школ и подрядчиков."
  );
  await hideRing(page);
  await page.evaluate(() =>
    window.__trassaDemo?.showOutro(
      "Удачной работы в нашем портале!",
      "ТрассА · цифровой портал для студентов, школ и подрядчиков"
    )
  );
  await sleep(5600);
}

async function phoneFade(page, active) {
  await page.evaluate((on) => window.__trassaDemo?.phoneFade(on), active);
}

async function hideRing(page, settleMs = 180) {
  await page.evaluate(() => window.__trassaDemo?.hideRing());
  if (settleMs > 0) await sleep(settleMs);
}

async function appNavigate(page, hashPath, { fade = true } = {}) {
  await hideRing(page, 220);
  if (fade) await phoneFade(page, true);
  const url = `${base}/#${hashPath.startsWith("/") ? hashPath : `/${hashPath}`}`;
  await page.evaluate(
    ({ iframeId, url: u }) => {
      document.getElementById(iframeId).src = u;
    },
    { iframeId: IFRAME_ID, url }
  );
  await waitAppReady(page);
  if (fade) await phoneFade(page, false);
}

async function waitAppReady(page) {
  const app = appFrame(page);
  await app.locator("body").waitFor({ state: "attached", timeout: 90000 });
  await app.locator(".entry-splash").waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
  await sleep(900);
  const btn = app.getByRole("button", { name: /^понятно$/i });
  if (await btn.count()) await btn.first().click({ timeout: 3000 }).catch(() => {});
  await app.locator("body").evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.dataset.cabinetTheme = "light";
  });
  await fixIframeViewport(page);
  await sleep(400);
}

async function setCopy(page, step, title, body, tip, progress) {
  markNarration(narrationLine(title, body, tip));
  await hideRing(page, 200);
  await page.evaluate(
    ({ step, title, body, tip, progress }) => {
      window.__trassaDemo?.setCopy(step, title, body, tip);
      window.__trassaDemo?.setProgress(progress);
    },
    { step, title, body, tip, progress }
  );
  await sleep(550);
  await pauseForTipRead(tip);
}

async function setCopyTip(page, tip) {
  markNarration(tip);
  await page.evaluate((t) => window.__trassaDemo?.setCopyTip(t), tip);
  await pauseForTipRead(tip);
}

async function smoothScrollApp(page, deltaY, durationMs = 800) {
  const app = appFrame(page);
  await app.locator("body").evaluate(
    ({ deltaY, durationMs }) =>
      new Promise((resolve) => {
        const startY = window.scrollY;
        const start = performance.now();
        const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const tick = (now) => {
          const t = Math.min(1, (now - start) / durationMs);
          window.scrollTo(0, startY + deltaY * easeInOut(t));
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    { deltaY, durationMs }
  );
  await sleep(durationMs + 80);
}

/** Плавный возврат к началу страницы (после демо карты — к кнопке «Войти»). */
async function scrollToPageTop(page, { durationMs = 950 } = {}) {
  await hideRing(page, 120);
  await page.evaluate(() => window.__trassaDemo?.hideCursor());
  const app = appFrame(page);
  await app.locator("body").evaluate(
    (durationMs) =>
      new Promise((resolve) => {
        const startY = window.scrollY;
        if (startY < 8) {
          window.scrollTo(0, 0);
          resolve();
          return;
        }
        const start = performance.now();
        const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const tick = (now) => {
          const t = Math.min(1, (now - start) / durationMs);
          window.scrollTo(0, startY * (1 - easeInOut(t)));
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    durationMs
  );
  await sleep(durationMs + 120);
  await fixIframeViewport(page).catch(() => {});
}

/** Прокрутка страницы кабинета без кольца и курсора — просто показать контент. */
async function demoScrollCabinetPage(page, { steps = 2, stepDelta = 250, stepDuration = 900 } = {}) {
  await hideRing(page, 120);
  await page.evaluate(() => window.__trassaDemo?.hideCursor());
  const app = appFrame(page);
  await app.locator("body").evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  await sleep(350);
  for (let i = 0; i < steps; i++) {
    await smoothScrollApp(page, stepDelta, stepDuration);
    await demoHold(500);
  }
}

/**
 * Координаты элемента в iframe → позиция на оболочке презентации (1920×1080).
 * Внутри iframe getBoundingClientRect() — относительно viewport iframe (390px).
 * Playwright boundingBox() для frameLocator уже в координатах страницы — его нельзя
 * складывать с iframeBox (иначе двойной сдвиг и кольцо «уезжает»).
 */
async function getShellBox(page, locator) {
  const box = await locator.first().boundingBox();
  if (!box || box.width < 1 || box.height < 1) return null;

  const borderRadius = await locator
    .first()
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.borderRadius || cs.borderTopLeftRadius || "14px";
    })
    .catch(() => "14px");

  return { ...box, borderRadius };
}

async function ensureElementInView(locator) {
  await locator
    .first()
    .evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" }))
    .catch(() => {});
  await sleep(320);
}

async function swipeRoleCardsTo(page, roleIndex) {
  const app = appFrame(page);
  const row = app.locator('[class*="cardsRow"]').first();
  if (!(await row.count())) return;

  await hideRing(page, 120);

  const rowBox = await getShellBox(page, row);
  if (rowBox) {
    const y = rowBox.y + rowBox.height * 0.55;
    const fromX = rowBox.x + rowBox.width * 0.78;
    const toX = rowBox.x + rowBox.width * 0.28;
    await page.evaluate(
      async ({ fromX, toX, y }) => {
        await window.__trassaDemo?.moveTo(fromX, y, 420);
        await window.__trassaDemo?.clickAnim();
        await window.__trassaDemo?.moveTo(toX, y, 680);
      },
      { fromX, toX, y }
    );
  }

  await row.evaluate(
    (rowEl, idx) =>
      new Promise((resolve) => {
        const card = rowEl.querySelector(`[data-role-index="${idx}"]`);
        if (!card) return resolve();
        const target = Math.max(0, card.offsetLeft - (rowEl.clientWidth - card.offsetWidth) / 2);
        const start = rowEl.scrollLeft;
        const distance = target - start;
        if (Math.abs(distance) < 6) return resolve();
        const durationMs = Math.min(950, 520 + Math.abs(distance) * 0.65);
        const startTime = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const tick = (now) => {
          const t = Math.min(1, (now - startTime) / durationMs);
          rowEl.scrollLeft = start + distance * ease(t);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    roleIndex
  );
  await sleep(520);
}

async function demoPoint(page, locator, moveMs = 850, opts = {}) {
  const { anchorX = 0.5, anchorY = 0.5 } = opts;
  await page.evaluate(() => window.__trassaDemo?.showCursor());
  await ensureElementInView(locator);
  const box = await getShellBox(page, locator);
  if (!box) return false;
  const cx = box.x + box.width * anchorX;
  const cy = box.y + box.height * anchorY;
  await page.evaluate(
    async ({ box, cx, cy, moveMs }) => {
      window.__trassaDemo?.hideRing();
      await window.__trassaDemo?.moveTo(cx, cy, moveMs);
      window.__trassaDemo?.showRing(box);
    },
    { box, cx, cy, moveMs }
  );
  return true;
}

async function demoClick(page, locator, opts = {}) {
  const { moveMs = 850, holdMs = 420, anchorX = 0.5, anchorY = 0.5, hideAfter = true } = opts;
  await page.evaluate(() => window.__trassaDemo?.showCursor());
  await ensureElementInView(locator);
  const handle = locator.first();
  const box = await getShellBox(page, handle);
  if (!box) {
    await handle.click({ timeout: 8000 }).catch(() => {});
    if (hideAfter) await hideRing(page, 180);
    return false;
  }
  const cx = box.x + box.width * anchorX;
  const cy = box.y + box.height * anchorY;
  await page.evaluate(
    async ({ box, cx, cy, moveMs }) => {
      window.__trassaDemo?.hideRing();
      await window.__trassaDemo?.moveTo(cx, cy, moveMs);
      window.__trassaDemo?.showRing(box);
    },
    { box, cx, cy, moveMs }
  );
  await sleep(holdMs);
  await page.evaluate(() => window.__trassaDemo?.clickAnim());
  await handle.click({ timeout: 8000 }).catch(() => {});
  if (hideAfter) await hideRing(page, 200);
  await sleep(400);
  return true;
}

async function demoHold(ms = 1200) {
  await sleep(ms);
}

async function waitForPage2MapPage(page) {
  const app = appFrame(page);
  await app
    .locator(".page2-v2-scene, .page2-v2__overview, body.route-page2")
    .first()
    .waitFor({ state: "attached", timeout: 20000 })
    .catch(() => {});
  await sleep(700);
}

async function scrollToMapSection(page) {
  await setCopyTip(page, "Прокручиваем страницу вниз до карты");
  await hideRing(page, 120);
  await page.evaluate(() => window.__trassaDemo?.hideCursor());
  const app = appFrame(page);
  const mapAnchor = app.locator(".page2-v2-map-stage, .page2-v2__map-panel, .leaflet-container").first();
  await mapAnchor.waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
  if (await mapAnchor.count()) {
    await mapAnchor.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" }));
  }
  await app.locator("body").evaluate(() => {
    const el =
      document.querySelector(".page2-v2-map-stage") ||
      document.querySelector(".page2-v2__map-panel") ||
      document.querySelector(".leaflet-container");
    el?.scrollIntoView({ block: "center", behavior: "auto" });
  });
  await sleep(450);
  await smoothScrollApp(page, 80, 450);
  await fixIframeViewport(page).catch(() => {});
  await sleep(500);
}

async function waitForMapReady(page) {
  const app = appFrame(page);
  await app.locator(".leaflet-container").waitFor({ state: "visible", timeout: 25000 });
  await sleep(1000);
  await mapDistrictMarker(app)
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(400);
}

function mapDistrictMarker(app) {
  return app.locator(".leaflet-marker-icon").filter({
    has: app.locator('[class*="markerMain"]'),
  });
}

function mapSubjectMarker(app) {
  return app.locator(".leaflet-marker-icon").filter({
    has: app.locator('[class*="markerSubject"]'),
  });
}

/** Перетаскивание карты Leaflet курсором (реальный pan, не только panBy). */
async function demoDragMapOnScreen(page, { dragX = -120, dragY = -36, startAnchorX = 0.55, startAnchorY = 0.48 } = {}) {
  const app = appFrame(page);
  const map = app.locator(".leaflet-container").first();
  if (!(await map.count())) return false;

  const box = await getShellBox(page, map);
  if (!box) return false;

  const startX = box.x + box.width * startAnchorX;
  const startY = box.y + box.height * startAnchorY;
  const endX = startX + dragX;
  const endY = startY + dragY;

  await page.evaluate(() => window.__trassaDemo?.showCursor());
  await page.evaluate(
    async ({ startX, startY, endX, endY }) => {
      window.__trassaDemo?.hideRing();
      await window.__trassaDemo?.moveTo(startX, startY, 620);
      window.__trassaDemo?.clickAnim();
      await window.__trassaDemo?.moveTo(endX, endY, 980);
    },
    { startX, startY, endX, endY }
  );

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 14;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    await page.mouse.move(startX + (endX - startX) * ease, startY + (endY - startY) * ease);
    await sleep(35);
  }
  await page.mouse.up();
  await sleep(700);
  return true;
}

/** Листаем карту пальцем → клик по метке округа → появляются метки регионов. */
async function demoMapMarkersFlow(page) {
  const app = appFrame(page);

  await setCopyTip(page, "Листаем карту пальцем");
  await demoDragMapOnScreen(page, { dragX: -90, dragY: -24, startAnchorX: 0.5, startAnchorY: 0.52 });
  await demoHold(700);

  const districts = mapDistrictMarker(app);
  const districtCount = await districts.count();
  if (districtCount === 0) {
    await setCopyTip(page, "Метки федеральных округов на интерактивной карте");
    await demoHold(900);
    return;
  }

  const tryIndices = [2, 0, 1, 3, 4, 5, 6, 7].filter((i) => i < districtCount);
  let subjectsVisible = false;

  for (const idx of tryIndices) {
    await setCopyTip(page, "Нажимаем на метку — откроются метки регионов");
    const district = districts.nth(idx);
    if (!(await district.count())) continue;
    await demoClick(page, district, { holdMs: 520, hideAfter: false });
    await mapSubjectMarker(app)
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
    if ((await mapSubjectMarker(app).count()) > 0) {
      subjectsVisible = true;
      break;
    }
    await demoHold(350);
  }

  if (!subjectsVisible) {
    await demoDragMapOnScreen(page, { dragX: 70, dragY: 15, startAnchorX: 0.45, startAnchorY: 0.5 });
    const fallback = districts.nth(Math.min(1, districtCount - 1));
    await demoClick(page, fallback, { holdMs: 520, hideAfter: false });
    await mapSubjectMarker(app)
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
  }

  await demoHold(1100);
  await hideRing(page, 150);
}

async function enterBetaPreviewForRole(page, roleIndex, roleLabel) {
  const app = appFrame(page);
  await app.locator('[data-role-index]').first().waitFor({ state: "visible", timeout: 20000 });

  await setCopyTip(page, `Листаем карточки и выбираем роль «${roleLabel}»`);
  await swipeRoleCardsTo(page, roleIndex);

  const roleCard = app.locator(`[data-role-index="${roleIndex}"]`);
  await roleCard.waitFor({ state: "visible", timeout: 10000 });
  await demoClick(page, roleCard, { anchorX: 0.5, anchorY: 0.78, holdMs: 480 });
  await sleep(700);

  await setCopyTip(page, "Нажимаем стрелку «Далее» внизу экрана");
  const nextBtn = app.locator(".page3-v2__next, button[aria-label='Далее']").first();
  await nextBtn.waitFor({ state: "visible", timeout: 8000 });
  await demoClick(page, nextBtn, { anchorX: 0.5, anchorY: 0.5, holdMs: 520 });
  await sleep(750);

  await setCopyTip(page, "Открываем кабинет через «Бета-просмотр»");
  const betaBtn = app.locator(".page3-v2__beta-btn, button.loginBetaPreview").filter({ hasText: /бета/i }).first();
  await betaBtn.waitFor({ state: "visible", timeout: 12000 });
  await demoClick(page, betaBtn, { holdMs: 520 });
  await sleep(1100);
  await fixIframeViewport(page).catch(() => {});
  await sleep(500);
}

function cabinetDockBtn(app, label) {
  return app.locator(".cabinet-quick-dock__btn").filter({ hasText: new RegExp(label, "i") });
}

async function waitContractorDashboard(page, app) {
  await app
    .locator(".contractor-glass-kpi-card, .cabinet-quick-dock")
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await app.locator("body").evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  await fixIframeViewport(page).catch(() => {});
  await sleep(400);
}

async function demoContractorKpiCards(page, app) {
  for (const { label, tip } of CONTRACTOR_KPI_STEPS) {
    await setCopyTip(page, tip);
    const card = app.locator(".contractor-glass-kpi-card").filter({ hasText: label });
    if (await card.count()) {
      await demoPoint(page, card.first(), 720);
      await demoHold(950);
    } else {
      await demoHold(700);
    }
  }
}

async function demoContractorPlannerBlocks(page, app) {
  await setCopyTip(page, "Планнер — задачи и напоминания по срокам работы");
  await hideRing(page, 120);
  await page.evaluate(() => window.__trassaDemo?.hideCursor());
  await app.locator("body").evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  await sleep(300);
  await smoothScrollApp(page, 340, 950);
  const planner = app.locator(".contractor-planner").first();
  if (await planner.count()) {
    await demoPoint(page, planner, 760);
    await demoHold(600);
  }
  await setCopyTip(page, "Дедлайны таблиц РАДОР — сроки сдачи и статус заполнения");
  await smoothScrollApp(page, 220, 800);
  const deadlines = app.locator(".contractor-rador-deadlines").first();
  if (await deadlines.count()) {
    await demoPoint(page, deadlines, 750);
    await demoHold(650);
  }
}

async function centerFloatingPanelForDemo(app, selector) {
  await app
    .locator(selector)
    .first()
    .evaluate((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.style.setProperty("left", "50%", "important");
      panel.style.setProperty("top", "50%", "important");
      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("transform", "translate(-50%, -50%)", "important");
      panel.style.setProperty("width", "min(400px, calc(100vw - 20px))", "important");
      panel.style.setProperty("max-width", "calc(100vw - 20px)", "important");
      try {
        const w = panel.getBoundingClientRect().width || 370;
        const h = panel.getBoundingClientRect().height || 480;
        sessionStorage.setItem(
          "trassa-ai-panel-pos",
          JSON.stringify({
            left: Math.max(10, (window.innerWidth - w) / 2),
            top: Math.max(52, (window.innerHeight - h) / 2),
          })
        );
      } catch {
        /* ignore */
      }
    })
    .catch(() => {});
  await sleep(280);
}

async function demoContractorMessengerAndAi(page, app) {
  await setCopyTip(page, "Мессенджер — переписка с кураторами и коллегами по программе");
  const msgrBtn = app.getByRole("button", { name: /мессенджер/i });
  if (await msgrBtn.count()) {
    await demoClick(page, msgrBtn.first(), { holdMs: 460 });
    await app.locator(".messenger-v2").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await fixIframeViewport(page).catch(() => {});
    await demoHold(900);
    await hideRing(page, 120);
    await demoHold(700);
    await demoClick(page, msgrBtn.first(), { holdMs: 420, hideAfter: true });
    await sleep(500);
  }

  await setCopyTip(page, "Т-бот — ИИ-помощник: подсказки по формам, документам и разделам кабинета");
  const aiBtn = app.getByRole("button", { name: /т-бот|чат с т-ботом/i });
  if (await aiBtn.count()) {
    await demoClick(page, aiBtn.first(), { holdMs: 480 });
    const aiPanel = app.locator('[aria-label="Чат с Т-ботом"]').first();
    await aiPanel.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await centerFloatingPanelForDemo(app, '[aria-label="Чат с Т-ботом"]');
    await fixIframeViewport(page).catch(() => {});
    await sleep(400);

    const textarea = app.locator('textarea[placeholder*="Т-бот"]');
    if (await textarea.count()) {
      await demoClick(page, textarea.first(), { holdMs: 320, hideAfter: false });
      await textarea.fill("Как заполнить таблицу РАДОР?");
      await demoHold(450);
      const sendBtn = app.getByRole("button", { name: /^отправить$/i });
      if (await sendBtn.count()) await demoClick(page, sendBtn.first(), { holdMs: 420, hideAfter: false });
      await app
        .getByText(/назначенную таблицу РАДОР|раздел «Формы»/i)
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {});
      await centerFloatingPanelForDemo(app, '[aria-label="Чат с Т-ботом"]');
      markNarration(TBOT_MOCK_REPLY);
      await demoHold(1500);
    } else {
      await demoHold(1100);
    }

    const closeAi = app.getByRole("button", { name: /^закрыть$/i });
    if (await closeAi.count()) await closeAi.first().click({ timeout: 3000 }).catch(() => {});
    else await aiBtn.first().click({ timeout: 3000 }).catch(() => {});
    await sleep(400);
  }
}

async function demoContractorCabinetSequence(page) {
  const app = appFrame(page);
  await waitContractorDashboard(page, app);
  await demoContractorKpiCards(page, app);

  await demoCabinetDockTab(page, app, "форм", {
    tip: "Раздел «Формы» — назначенные таблицы и заполнение отчётности РАДОР",
    titleRe: /таблиц/i,
    scroll: true,
    scrollSteps: 2,
    scrollDelta: 260,
  });

  await demoCabinetDockTab(page, app, "документ", {
    tip: "«Документы» — письма ассоциаций, файлы и отправка материалов",
    titleRe: /документ/i,
    scroll: true,
    scrollSteps: 2,
    scrollDelta: 240,
  });

  const homeBtn = cabinetDockBtn(app, "главн");
  if (await homeBtn.count()) {
    await setCopyTip(page, "Возвращаемся на главную — планнер и дедлайны таблиц");
    await demoClick(page, homeBtn.first(), { holdMs: 440 });
    await waitContractorDashboard(page, app);
  }

  await demoContractorPlannerBlocks(page, app);
  await demoContractorMessengerAndAi(page, app);
}

async function waitCabinetSubpage(page, app, titleRe) {
  if (titleRe) {
    await app
      .locator(".cabinet-v2-dashboard__context-kicker, .page4-v2__page-title")
      .filter({ hasText: titleRe })
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
  }
  await sleep(400);
  await fixIframeViewport(page).catch(() => {});
  await sleep(200);
}

async function demoCabinetDockTab(page, app, label, { tip, titleRe, pointLocator, scroll, scrollSteps, scrollDelta } = {}) {
  if (tip) await setCopyTip(page, tip);
  const btn = cabinetDockBtn(app, label);
  if (!(await btn.count())) return false;
  await demoClick(page, btn.first(), { holdMs: 480 });
  if (titleRe) await waitCabinetSubpage(page, app, titleRe);
  else await sleep(500);
  if (scroll) {
    await demoScrollCabinetPage(page, { steps: scrollSteps ?? 2, stepDelta: scrollDelta ?? 250 });
    await demoHold(550);
  } else if (pointLocator && (await pointLocator.count())) {
    await demoPoint(page, pointLocator.first(), 780);
    await demoHold(850);
  } else {
    await demoHold(900);
  }
  return true;
}

async function switchRoleFromCabinet(page) {
  const app = appFrame(page);
  const logout = app.locator(".cabinet-soft-toolbar__glass-btn--logout").first();
  if (await logout.count()) {
    await demoClick(page, logout);
    await waitAppReady(page);
    return;
  }
  await appNavigate(page, "/page3");
}

function convertToMp4(webmPath, mp4Path) {
  let ffmpegPath;
  try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  } catch {
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
      "slow",
      "-crf",
      "17",
      "-profile:v",
      "high",
      "-level",
      "4.2",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-vf",
      `scale=${PRESENT_W}:${PRESENT_H}:flags=lanczos`,
      mp4Path,
    ],
    { stdio: "inherit" }
  );
  return r.status === 0 ? mp4Path : webmPath;
}

await mkdir(outDir, { recursive: true });
console.log(`Recording (${PRESENT_W}×${PRESENT_H} 1080p, ~${TARGET_SEC}s): ${base}\n`);

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage"],
});
const videoDir = path.join(outDir, "_tmp-instruction");
await mkdir(videoDir, { recursive: true });

const context = await browser.newContext({
  viewport: { width: PRESENT_W, height: PRESENT_H },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: PRESENT_W, height: PRESENT_H } },
  locale: "ru-RU",
  userAgent: devices["iPhone 13"].userAgent,
});

await prepareContext(context);
const page = await context.newPage();

page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) return;
  const url = frame.url();
  if (!url || url === "about:blank" || !url.includes(new URL(base).host)) return;
  fixIframeViewport(page).catch(() => {});
});

const t0 = Date.now();
elapsed = () => (Date.now() - t0) / 1000;
const padToTarget = async (minHold = 0.3) => {
  const left = TARGET_SEC - elapsed();
  if (left > minHold) await sleep(left * 1000);
};

try {
  await openShell(page);

  /* —— Интро: приветствие → телефон по центру → сплэш → сдвиг влево + описание —— */
  await playIntroSequence(page);
  await loadAppInPhone(page, "/");
  await waitForEntrySplashComplete(page);
  await expandPhoneToDemoLayout(page);
  await waitForHomePage(page);

  const app = () => appFrame(page);

  await setCopy(
    page,
    "Раздел 1 из 5",
    "Стартовая страница",
    "Статистика программы и переход к карте.",
    "На главной — ключевые показатели программы",
    8
  );
  const homeCta = app().getByRole("button", { name: /перейти в управление/i });
  await demoHold(1400);

  await setCopy(
    page,
    "Раздел 2 из 5",
    "Карта подрядчиков",
    "Интерактивная карта России: округа, регионы и организации-партнёры.",
    "Нажимаем «Перейти в управление»",
    22
  );
  if (await homeCta.count()) await demoClick(page, homeCta.first());
  else await appNavigate(page, "/services");
  await waitForPage2MapPage(page);
  await scrollToMapSection(page);
  await waitForMapReady(page);
  await demoMapMarkersFlow(page);

  await setCopyTip(page, "Возвращаемся к началу страницы");
  await scrollToPageTop(page);
  await demoHold(450);

  const loginBtn = app().getByRole("button", { name: /^войти$/i });
  await setCopy(
    page,
    "Раздел 2 из 5",
    "Карта подрядчиков",
    "Интерактивная карта России: округа, регионы и организации-партнёры.",
    "«Войти» — вход в кабинеты портала: школа, студент, подрядчик",
    32
  );
  if (await loginBtn.count()) await demoPoint(page, loginBtn.first(), 1100);
  else await demoPoint(page, app().locator('[class*="btnOutline"]').first(), 1100);
  await demoHold(1300);

  await setCopy(
    page,
    "Раздел 3 из 5",
    "Вход в портал",
    "Страница авторизации и выбор роли: школьник, студент, подрядчик или институт.",
    "Нажимаем «Войти»",
    38
  );
  if (await loginBtn.count()) await demoClick(page, loginBtn.first());
  else await appNavigate(page, "/page3");
  await demoHold(750);

  await setCopy(
    page,
    "Раздел 4 из 5",
    "Кабинет студента",
    "Главная, заявки и портфолио — переключаются нижней панелью навигации.",
    "Выбираем роль «Студент» и открываем демо-кабинет.",
    52
  );
  await enterBetaPreviewForRole(page, 1, "Студент");

  await setCopyTip(page, "Нижняя панель: Главная, Заявки, Портфолио и Профиль");
  const dockHome = cabinetDockBtn(app(), "главн");
  if (await dockHome.count()) await demoPoint(page, dockHome.first(), 700);
  await demoHold(900);

  await demoCabinetDockTab(page, app(), "заявк", {
    tip: "Раздел «Заявки» — запросы, ответы и уведомления по практике",
    titleRe: /заявк/i,
    scroll: true,
    scrollSteps: 2,
    scrollDelta: 260,
  });

  await demoCabinetDockTab(page, app(), "портфол", {
    tip: "«Портфолио» — проекты, кейсы и участие в мероприятиях",
    titleRe: /портфол/i,
    scroll: true,
    scrollSteps: 2,
    scrollDelta: 260,
  });

  await setCopy(
    page,
    "Раздел 5 из 5",
    "Кабинет подрядчика",
    "KPI на главной, формы и документы, планнер, дедлайны, мессенджер и ИИ-помощник Т-бот.",
    "Выходим из кабинета студента и входим как «Подрядчик» через бета-просмотр.",
    68
  );
  await setCopyTip(page, "Выходим из бета-просмотра");
  await switchRoleFromCabinet(page);
  await enterBetaPreviewForRole(page, 2, "Подрядчик");
  await demoContractorCabinetSequence(page);

  await hideRing(page);

  /* —— Outro: нейтральный фон —— */
  await playOutro(page);

  await padToTarget(0.3);

  const video = page.video();
  await page.close();
  await context.close();

  const webmSrc = await video.path();
  const webmDest = path.join(outDir, "mobile-instruction.webm");
  const mp4Dest = path.join(outDir, "mobile-instruction.mp4");

  await rename(webmSrc, webmDest);
  console.log(`\n✓ WebM: ${webmDest}`);
  console.log(`  Duration: ~${elapsed().toFixed(1)}s · ${PRESENT_W}×${PRESENT_H}`);

  const finalPath = convertToMp4(webmDest, mp4Dest);
  const cuesPath = path.join(outDir, "mobile-instruction.cues.json");
  const withVoice =
    finalPath === mp4Dest
      ? muxNarrationTrack(mp4Dest, cuesPath)
      : finalPath.endsWith(".mp4")
        ? muxNarrationTrack(finalPath, cuesPath)
        : finalPath;

  if (withVoice === mp4Dest || finalPath === mp4Dest) {
    console.log(`✓ MP4:  ${mp4Dest} (1080p${NARRATION_ENABLED ? ", with narrator" : ""})`);
    try {
      await unlink(webmDest);
    } catch {
      /* keep */
    }
  } else if (finalPath.endsWith(".webm")) {
    const mp4Alt = path.join(outDir, "mobile-instruction-new.mp4");
    const altPath = convertToMp4(webmDest, mp4Alt);
    if (altPath === mp4Alt) {
      console.log(`✓ MP4:  ${mp4Alt} (1080p, основной файл занят — переименуйте вручную)`);
    }
  }

  console.log("\nDone.");
} catch (e) {
  console.error("Recording failed:", e);
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
}
