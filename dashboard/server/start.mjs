import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PEARL_DASHBOARD_PORT || "3000";
const children = [
  spawn(process.execPath, ["--env-file=.env.server.local", "server/index.mjs"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...(process.argv.includes("--preview") ? ["preview"] : []), "--host", "127.0.0.1", "--port", port, "--strictPort"], { cwd: root, stdio: "inherit" }),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  children.forEach(child => child.kill());
  process.exitCode = code;
}
children.forEach(child => child.on("exit", code => stop(code ?? 1)));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
