/**
 * Запасной установщик для CI, если neo-setup portable падает:
 * portable из уже собранного packaged-app/win-unpacked (без мастера установки).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const unpacked = path.join(root, "packaged-app", "win-unpacked");
const releaseRoot = path.join(root, "release");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const destName = `trassa-setup-${version}.exe`;

function main() {
  if (!fs.existsSync(unpacked)) {
    console.error("[build-ci-portable-fallback] нет win-unpacked");
    process.exit(1);
  }
  const env = {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
    WIN_CSC_LINK: "",
    WIN_CSC_KEY_PASSWORD: "",
  };
  const cfgPath = path.join(root, ".electron-builder-ci-portable.json");
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        ...pkg.build,
        forceCodeSigning: false,
        directories: { output: "packaged-app" },
        win: {
          target: ["portable"],
          icon: "electron-assets/icon.ico",
          signAndEditExecutable: false,
          verifyUpdateCodeSignature: false,
        },
        portable: { artifactName: destName },
        compression: "store",
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("[build-ci-portable-fallback] electron-builder --prepackaged win-unpacked …");
  try {
    execSync(
      `npx electron-builder --win portable --publish never --prepackaged "${unpacked}" --config "${cfgPath}"`,
      { cwd: root, env, stdio: "inherit", shell: true }
    );
  } finally {
    try {
      fs.unlinkSync(cfgPath);
    } catch {
      /* ignore */
    }
  }
  const dir = path.join(root, "packaged-app");
  const exes = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".exe") && !/unins/i.test(f))
        .map((f) => path.join(dir, f))
    : [];
  const src = exes.find((p) => path.basename(p) === destName) || exes[0];
  if (!src) {
    console.error("[build-ci-portable-fallback] portable .exe не найден в packaged-app/");
    process.exit(1);
  }
  fs.mkdirSync(releaseRoot, { recursive: true });
  fs.copyFileSync(src, path.join(releaseRoot, destName));
  console.log("[build-ci-portable-fallback] OK:", path.join("release", destName));
}

main();
