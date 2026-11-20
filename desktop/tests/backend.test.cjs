const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { startBackend } = require("../src/backend.cjs");

test("startup deadline closes owned child without hanging", async () => {
  await assert.rejects(
    startBackend({
      executable: process.execPath,
      args: ["-e", "process.stdin.resume()"],
      assets: ".",
      dbPath: path.join(os.tmpdir(), "unused-leaklens.db"),
      timeoutMs: 250,
    }),
    /timed out/,
  );
});
test("missing executable produces actionable startup failure", async () => {
  await assert.rejects(
    startBackend({
      executable: "/no-such-leaklens-backend",
      assets: ".",
      dbPath: "unused.db",
      timeoutMs: 1000,
    }),
    /start|ENOENT/,
  );
});
test("unexpected exit fails startup promptly", async () => {
  await assert.rejects(
    startBackend({
      executable: process.execPath,
      args: ["-e", "process.exit(7)"],
      assets: ".",
      dbPath: "unused.db",
      timeoutMs: 5000,
    }),
    /exited/,
  );
});
test("real backend authenticates, serves assets, and stops on pipe close", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "leaklens-runtime-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<html>desktop</html>");
  const root = path.resolve(__dirname, "../..");
  const python = path.join(
    root,
    "backend",
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const backend = await startBackend({
    executable: python,
    args: ["-m", "leaklens.desktop"],
    cwd: path.join(root, "backend"),
    assets: dir,
    dbPath: path.join(dir, "demo.sqlite3"),
    timeoutMs: 10000,
  });
  try {
    assert.equal((await fetch(backend.origin + "/desktop/ready")).status, 401);
    assert.equal(
      (
        await fetch(backend.origin + "/desktop/ready", {
          headers: { Authorization: `Bearer ${backend.tokens.operator}` },
        })
      ).status,
      200,
    );
    assert.equal((await fetch(backend.origin + "/operations")).status, 200);
  } finally {
    await backend.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  assert.notEqual(backend.child.exitCode, null);
});
