const { test, expect, _electron: electron } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const desktop = path.resolve(__dirname, "..");
function launch(data) {
  const packaged = process.env.LEAKLENS_PACKAGED;
  return electron.launch({
    ...(packaged
      ? { executablePath: path.resolve(packaged), args: [] }
      : { args: [desktop] }),
    env: {
      ...process.env,
      LEAKLENS_DATA_DIR: data,
      ...(packaged ? { PATH: "" } : {}),
    },
  });
}
const dead = (pid) => {
  try {
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
};

test("offline desktop completes response and persists after packaged restart", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "leaklens-desktop-",
    ),
  );
  let app;
  try {
    app = await launch(data);
    const page = await app.firstWindow();
    await expect(
      page.getByRole("heading", { name: "Network intelligence" }),
    ).toBeVisible();
    await expect(page.getByText("Offline desktop · local data")).toBeVisible();
    await expect(page.getByText("Backend connected")).toBeVisible();
    expect(await page.evaluate(() => typeof require)).toBe("undefined");
    const preferences = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
    );
    expect(preferences.contextIsolation).toBe(true);
    expect(preferences.sandbox).toBe(true);
    expect(preferences.nodeIntegration).toBe(false);
    await expect(page.getByText("Demo access", { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .filter((url) => !url.startsWith(location.origin + "/")),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
    // Internet connectivity signals must not disable the loopback backend.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });
    await expect(
      page.getByRole("button", { name: "Simulate main break" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Simulate main break" }).click();
    await expect(page.getByLabel("Advisory draft")).toBeVisible();
    await page
      .getByRole("button", { name: "Approve simulated advisory", exact: true })
      .click();
    await page.getByLabel("Crew assignment").fill("DESKTOP-CREW");
    await page
      .getByRole("button", { name: "Approve crew assignment", exact: true })
      .click();
    await page.getByRole("link", { name: "Crew app", exact: true }).click();
    await page
      .getByRole("button", { name: "Record repair", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Record flush", exact: true })
      .click();
    await page.getByLabel("Sample ID").fill("FAILED-01");
    await page.getByLabel("Sample result").selectOption("failed");
    await page
      .getByRole("button", { name: "Record sample", exact: true })
      .click();
    await expect(
      page.getByText("Reflush required", { exact: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Record flush", exact: true })
      .click();
    for (const id of ["CLEAR-01", "CLEAR-02"]) {
      await page.getByLabel("Sample ID").fill(id);
      await page.getByLabel("Sample result").selectOption("clear");
      await page
        .getByRole("button", { name: "Record sample", exact: true })
        .click();
      await expect(page.getByText(id, { exact: true })).toBeVisible();
    }
    await page.getByLabel("Sample ID").fill("CLEAR-02");
    await page
      .getByRole("button", { name: "Record sample", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Duplicate sample ID");
    await page.getByRole("link", { name: "Operations", exact: true }).click();
    await page
      .getByRole("button", { name: "Approve simulated all-clear", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Pressure must be fresh and recovered",
    );
    await page
      .getByRole("button", { name: "Submit recovery reading", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Approve simulated all-clear", exact: true })
      .click();
    await expect(
      page.getByText("Incident closed", { exact: true }),
    ).toBeVisible();
    const origin = new URL(page.url()).origin;
    const childPids = await app.evaluate(() => process._getActiveHandles()
      .filter(handle => handle.constructor.name === "ChildProcess")
      .map(handle => handle.pid));
    expect(childPids.length).toBeGreaterThan(0);
    await page.screenshot({
      path: path.join(desktop, "test-results", "desktop-closed.png"),
      fullPage: true,
    });
    await app.close();
    app = undefined;
    for (const pid of childPids) await expect.poll(() => dead(pid)).toBe(true);
    await expect
      .poll(async () => {
        try {
          await fetch(origin + "/health", { signal: AbortSignal.timeout(500) });
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
    app = await launch(data);
    const reopened = await app.firstWindow();
    await expect(
      reopened.getByText("Incident closed", { exact: true }),
    ).toBeVisible();
    await reopened.getByRole("link", { name: "Crew app", exact: true }).click();
    for (const id of ["FAILED-01", "CLEAR-01", "CLEAR-02"])
      await expect(reopened.getByText(id, { exact: true })).toBeVisible();
    expect(fs.existsSync(path.join(data, "demo.sqlite3"))).toBe(true);
  } finally {
    if (app) await app.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test("second launch focuses existing application rather than starting another backend", async () => {
  const data = fs.mkdtempSync(
    path.join(process.env.JCODE_SCRATCH_DIR || os.tmpdir(), "leaklens-single-"),
  );
  const app = await launch(data);
  try {
    const page = await app.firstWindow();
    await expect(page.getByText("Backend connected")).toBeVisible();
    const exe = process.env.LEAKLENS_PACKAGED || require("electron");
    const child = spawn(exe, process.env.LEAKLENS_PACKAGED ? [] : [desktop], {
      env: { ...process.env, LEAKLENS_DATA_DIR: data },
      stdio: "ignore",
    });
    await expect.poll(() => child.exitCode, { timeout: 15000 }).toBe(0);
    expect(
      await app.evaluate(
        ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
      ),
    ).toBe(1);
    await page.getByRole("button", { name: "Refresh data" }).click();
    await expect(page.getByText("Backend connected")).toBeVisible();
  } finally {
    await app.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});
