/**
 * После server:proddeps — убрать случайные ссылки на корень приложения в server/node_modules.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nm = path.join(root, "server", "node_modules");
const drop = ["trassa-app", "packaged-app", "release", "setup-wizard"];

for (const name of drop) {
  const target = path.join(nm, name);
  if (!fs.existsSync(target)) continue;
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  console.log("[sanitize-server-node-modules] удалено:", path.join("server", "node_modules", name));
}
