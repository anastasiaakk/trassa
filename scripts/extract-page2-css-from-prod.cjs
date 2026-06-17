#!/usr/bin/env node
/** Извлечь Page2.module.css из продакшен-бандла Page2-*.css */
const fs = require("fs");
const https = require("https");
const path = require("path");

const BASE = "https://trassa.duckdns.org";
const OUT = path.join(__dirname, "../src/pages/Page2.module.css");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "trassa-extract-page2-css/1" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetch(new URL(res.headers.location, url).href).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

async function main() {
  const indexJs = await fetch(`${BASE}/assets/index-Bqlj6aqO.js`);
  const cssMatch = indexJs.match(/\.\/Page2-([A-Za-z0-9_-]+\.css)/);
  const cssFile = cssMatch ? `Page2-${cssMatch[1]}` : "Page2-BXt6v0jE.css";
  const cssUrl = `${BASE}/assets/${cssFile}`;
  console.log("GET", cssUrl);
  let css = await fetch(cssUrl);

  const hash = css.match(/_pageRoot_([a-z0-9]+)_\d+/i)?.[1];
  if (!hash) {
    console.error("Page2 module hash not found");
    process.exit(1);
  }

  const re = new RegExp(`\\.?(_[A-Za-z][A-Za-z0-9]*)_${hash}_\\d+`, "g");
  css = css.replace(re, (_, underscored) => `.${underscored.slice(1)}`);

  const start = css.indexOf(".pageRoot");
  const endMarkers = [".leaflet-container", "._standalone_"];
  let end = css.length;
  for (const m of endMarkers) {
    const i = css.indexOf(m, start + 1);
    if (i > start) end = Math.min(end, i);
  }
  let moduleCss = css.slice(start, end).trim();

  moduleCss =
    "/* Синхронизировано с https://trassa.duckdns.org/ (Page2 CSS chunk) */\n\n" +
    moduleCss;

  fs.writeFileSync(OUT, moduleCss, "utf8");
  console.log("Wrote", OUT, `(${moduleCss.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
