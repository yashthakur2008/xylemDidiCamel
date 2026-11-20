const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { createInterface } = require("node:readline");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startBackend({
  executable,
  args = [],
  cwd,
  assets,
  dbPath,
  timeoutMs = 20000,
}) {
  const tokens = Object.fromEntries(
    ["operator", "crew", "ingest"].map((role) => [
      role,
      randomBytes(32).toString("hex"),
    ]),
  );
  const child = spawn(executable, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: false,
  });
  let stopped = false,
    exitError;
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      exitError = new Error(
        `Local backend exited (${code ?? signal}). Restart LeakLens.`,
      );
      resolve();
    });
    child.once("error", (error) => {
      exitError = new Error(
        `Could not start local backend: ${error.code || "launch failure"}`,
      );
      resolve();
    });
  });
  child.stdin.on("error", () => {});
  child.stderr.resume(); // Never forward backend output that might contain configuration.
  const stop = async () => {
    if (stopped) return exited;
    stopped = true;
    child.stdin.end();
    await Promise.race([exited, delay(2000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await Promise.race([exited, delay(2000)]);
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    await Promise.race([exited, delay(1000)]);
  };
  const lines = createInterface({ input: child.stdout });
  let port;
  lines.on("line", (line) => {
    try {
      const value = JSON.parse(line);
      if (Number.isInteger(value.port) && value.port > 0 && value.port <= 65535)
        port = value.port;
    } catch {}
  });
  child.stdin.write(JSON.stringify({ db_path: dbPath, tokens, assets }) + "\n");
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      if (exitError) throw exitError;
      if (port) {
        const origin = `http://127.0.0.1:${port}`;
        try {
          const response = await fetch(origin + "/desktop/ready", {
            headers: { Authorization: `Bearer ${tokens.operator}` },
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(500, deadline - Date.now())),
            ),
          });
          if (response.ok) {
            await response.json();
            return { origin, tokens, child, stop, exited };
          }
        } catch {}
      }
      await delay(50);
    }
    throw new Error("Local backend startup timed out. Restart LeakLens.");
  } catch (error) {
    await stop();
    throw error;
  } finally {
    lines.close();
  }
}
module.exports = { startBackend };
