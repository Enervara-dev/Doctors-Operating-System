/**
 * Production launcher for a single-container deployment (Railway, Render, Fly).
 *
 * The platform gives us exactly one public port. Next.js takes it and proxies
 * `/api/*` to the Express service over loopback, so the API is never exposed
 * directly and there is no cross-origin hop for the live event stream.
 *
 *   $PORT ─▶ next start ──(rewrite)──▶ http://localhost:$API_PORT ─▶ Express
 *
 * Both children are spawned through `process.execPath` rather than a shell, so
 * there is no dependency on `concurrently` surviving a production install and
 * no npm shim to break on Windows.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const webPort = process.env.PORT ?? "3000";
/**
 * The API's port is internal. It must stay off `$PORT`, which belongs to the
 * web process, and it must match the `API_ORIGIN` the rewrite was built with.
 */
const apiPort = process.env.API_PORT ?? "4000";

const children = [];
let shuttingDown = false;

function start(name, entry, args, env) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    // One half of the app is useless without the other: exit and let the
    // platform restart the container rather than serve a broken deployment.
    console.error(`[start] ${name} exited (code=${code} signal=${signal}); stopping.`);
    stop(signal ? 1 : (code ?? 1));
  });

  children.push(child);
  return child;
}

function stop(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  // Give both a moment to close their sockets before the process goes away.
  setTimeout(() => process.exit(code), 3000).unref();
}

start("api", path.join(root, "backend", "dist", "backend", "src", "server.js"), [], {
  PORT: apiPort,
  API_PORT: apiPort,
});

start("web", require.resolve("next/dist/bin/next"), ["start", "--port", webPort], {
  PORT: webPort,
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => stop(0));
}
