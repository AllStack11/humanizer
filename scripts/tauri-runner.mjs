import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, delimiter } from "node:path";
import { spawn } from "node:child_process";

const mode = process.argv[2];
const passthroughArgs = process.argv.slice(3);

if (!mode || !["dev", "build"].includes(mode)) {
  console.error("Usage: node scripts/tauri-runner.mjs <dev|build> [...args]");
  process.exit(1);
}

const env = { ...process.env };
const pathEntries = (env.PATH || "").split(delimiter).filter(Boolean);

const cargoCandidates = [
  resolve(homedir(), ".cargo", "bin"),
  process.env.USERPROFILE ? resolve(process.env.USERPROFILE, ".cargo", "bin") : null,
].filter(Boolean);

for (const candidate of cargoCandidates) {
  if (existsSync(candidate) && !pathEntries.includes(candidate)) {
    pathEntries.unshift(candidate);
  }
}

env.PATH = pathEntries.join(delimiter);

const tauriBin = resolve(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri"
);

const child = spawn(tauriBin, [mode, ...passthroughArgs], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
