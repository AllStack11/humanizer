import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const packageJsonPath = resolve(root, "package.json");
const cargoTomlPath = resolve(root, "src-tauri", "Cargo.toml");
const tauriConfPath = resolve(root, "src-tauri", "tauri.conf.json");
const uiVersionPath = resolve(root, "src", "constants", "version.js");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

if (!version || typeof version !== "string") {
  console.error("Cannot sync version: package.json version is missing or invalid.");
  process.exit(1);
}

const cargoTomlRaw = readFileSync(cargoTomlPath, "utf8");
const cargoVersionPattern = /^version\s*=\s*"[^"]*"/m;
if (!cargoVersionPattern.test(cargoTomlRaw)) {
  console.error("Cannot sync version: failed to find Cargo.toml version field.");
  process.exit(1);
}
const cargoTomlNext = cargoTomlRaw.replace(
  cargoVersionPattern,
  `version = "${version}"`
);
writeFileSync(cargoTomlPath, cargoTomlNext, "utf8");

const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`, "utf8");

const uiVersionSource = `export const APP_VERSION = "${version}";\n`;
writeFileSync(uiVersionPath, uiVersionSource, "utf8");

console.log(`Synced app version ${version} to Cargo, Tauri config, and frontend constants.`);
