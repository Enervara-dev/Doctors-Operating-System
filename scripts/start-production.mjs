/**
 * Production launcher for a single-container deployment (Railway, Render, Fly).
 *
 * The platform gives us exactly one public port. Next.js takes it and proxies
 * `/api/*` to the Express service over loopback, so the API is never exposed
 * directly and there is no cross-origin hop for the live event stream.
 *
 *   $PORT ─▶ next start ──(rewrite)──▶ http://127.0.0.1:$API_PORT ─▶ Express
 *
 * Express is bound to `127.0.0.1`, not just to a different port. A platform
 * proxy discovers a service by looking for a listener on a public interface, so
 * a second public listener in the same container can win the domain and serve
 * API 404s at `/`. Loopback makes that impossible rather than unlikely.
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

/** The public port. This belongs to Next.js and to nothing else. */
const webPort = process.env.PORT ?? "3000";
/** Internal only. Must match the `API_ORIGIN` the rewrite was built with. */
const apiPort = process.env.API_PORT ?? "4000";
const apiHost = "127.0.0.1";

if (webPort === apiPort) {
  console.error(
    `[start] PORT and API_PORT are both ${webPort}. The public port belongs to ` +
      `Next.js; set API_PORT to a different internal port (and rebuild with a ` +
      `matching API_ORIGIN).`,
  );
  process.exit(1);
}

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

console.log(
  `[start] web on 0.0.0.0:${webPort} (public) · api on ${apiHost}:${apiPort} (loopback only)`,
);

start("api", path.join(root, "backend", "dist", "backend", "src", "server.js"), [], {
  API_HOST: apiHost,
  API_PORT: apiPort,
  // Overridden so an inherited platform `PORT` can never reach the API.
  PORT: apiPort,
});

start("web", require.resolve("next/dist/bin/next"), ["start", "--port", webPort], {
  PORT: webPort,
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => stop(0));
}
