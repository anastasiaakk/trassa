/**
 * Уменьшает setup-wizard/payload-app перед electron-builder portable (CI: меньше путей/объём).
 */
const fs = require("fs");
const path = require("path");

const payload = path.join(__dirname, "..", "setup-wizard", "payload-app");

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" && dir.includes(`${path.sep}node_modules${path.sep}`)) {
        continue;
      }
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

function shouldDrop(filePath) {
  const rel = filePath.replace(/\\/g, "/").toLowerCase();
  if (rel.endsWith(".map")) return true;
  if (rel.includes("/test/") || rel.includes("/tests/")) return true;
  if (rel.includes("/__tests__/")) return true;
  if (rel.includes("/.github/")) return true;
  if (rel.includes("/docs/") && rel.includes("node_modules")) return true;
  if (rel.endsWith("/readme.md") && rel.includes("node_modules")) return true;
  if (rel.endsWith("/changelog.md") && rel.includes("node_modules")) return true;
  return false;
}

function main() {
  if (!fs.existsSync(payload)) {
    console.warn("[prune-setup-payload] нет payload-app — пропуск");
    return;
  }
  let removed = 0;
  walk(payload, (file) => {
    if (!shouldDrop(file)) return;
    try {
      fs.unlinkSync(file);
      removed++;
    } catch {
      /* ignore */
    }
  });
  console.log(`[prune-setup-payload] удалено файлов: ${removed}`);
}

main();
