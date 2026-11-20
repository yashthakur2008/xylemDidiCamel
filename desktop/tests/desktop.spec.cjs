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
    const childPids = await app.evaluate(() =>
      process
        ._getActiveHandles()
        .filter((handle) => handle.constructor.name === "ChildProcess")
        .map((handle) => handle.pid),
    );
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

test("installed Confluence isolates repeatable trials and preserves them after restart", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-evaluation-",
    ),
  );
  let app;
  try {
    app = await launch(data);
    let page = await app.firstWindow();
    await expect(page.getByRole("link", { name: /Confluence/ })).toBeVisible();
    await page
      .getByRole("button", { name: "Simulate main break", exact: true })
      .click();
    await expect(page.getByLabel("Advisory draft")).toBeVisible();
    await page.getByRole("link", { name: "Test mode", exact: true }).click();
    await page
      .getByLabel("Participant code", { exact: true })
      .fill("INSTALL-TEST");
    await page
      .getByRole("button", { name: "Run brief-dip trial", exact: true })
      .click();
    await expect(
      page.getByText("No sustained incident created", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset test / new trial", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Run main-break trial", exact: true })
      .click();
    await expect(
      page.getByText("Sustained pressure loss", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Investigation and remaining uncertainty", { exact: true })
      .fill(
        "Installed automated acceptance only. Confirm boundary and sensor before response.",
      );
    await page
      .getByRole("button", { name: "Save investigation notes", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Mark response ready for review",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("First response frozen", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Operations", exact: true }).click();
    await expect(page.getByLabel("Advisory draft")).toBeVisible();
    await app.close();
    app = undefined;
    app = await launch(data);
    page = await app.firstWindow();
    await expect(page.getByLabel("Advisory draft")).toBeVisible();
    await page.getByRole("link", { name: "Test mode", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Resume INSTALL-TEST/ }),
    ).toHaveCount(2);
    await page
      .getByRole("button", { name: /Resume INSTALL-TEST.*main break/ })
      .click();
    await expect(
      page.getByText("First response frozen", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(desktop, "test-results", "confluence-trial.png"),
      fullPage: true,
    });
  } finally {
    if (app) await app.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

const savedNotes =
  "Saved investigation: verify the boundary and pressure sensor.";
const draftNotes =
  "Unsaved investigation: keep this draft while checking the sensor.";

async function editTrial(app) {
  const page = await app.firstWindow();
  await expect(page.getByText("Backend connected")).toBeVisible();
  await page.getByRole("link", { name: "Test mode", exact: true }).click();
  await page
    .getByLabel("Participant code", { exact: true })
    .fill("NATIVE-DIRTY");
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  const notes = page.getByLabel("Investigation and remaining uncertainty", {
    exact: true,
  });
  await notes.fill(savedNotes);
  await page
    .getByRole("button", { name: "Save investigation notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save investigation notes", exact: true }),
  ).toBeDisabled();
  await notes.fill(draftNotes);
  // Drain renderer effects and their IPC without setting dirty state in the test.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.evaluate(() => window.leaklensDesktop.credentials());
  return page;
}

async function answerDiscard(app, answer) {
  // Only the native dialog is mocked. Dirty state, IPC, lifecycle and backend are real.
  await app.evaluate(({ dialog }, response) => {
    dialog.showMessageBoxSync = () => response;
  }, answer);
}

async function backendPids(app) {
  return app.evaluate(() =>
    process
      ._getActiveHandles()
      .filter((handle) => handle.constructor.name === "ChildProcess")
      .map((handle) => handle.pid),
  );
}

async function cleanupDesktop(app, data) {
  if (app) {
    // The application may already have exited through the lifecycle under test.
    await answerDiscard(app, 1).catch(() => {});
    await app.close().catch(() => {});
  }
  fs.rmSync(data, { recursive: true, force: true });
}

test("native quit cancellation preserves draft and running backend, discard cleans child", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-dirty-quit-",
    ),
  );
  const app = await launch(data);
  try {
    const page = await editTrial(app);
    const origin = new URL(page.url()).origin;
    const pids = await backendPids(app);
    expect(pids.length).toBeGreaterThan(0);
    await answerDiscard(app, 0);
    await app.evaluate(({ app }) => {
      app.quit();
    });
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    expect((await fetch(origin + "/health")).ok).toBe(true);
    for (const pid of pids) expect(dead(pid)).toBe(false);
    await page
      .getByRole("button", { name: "Save investigation notes", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Save investigation notes",
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByLabel("Investigation and remaining uncertainty", { exact: true })
      .fill(draftNotes + " More edits.");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await answerDiscard(app, 1);
    const closed = app.waitForEvent("close");
    await app.evaluate(({ app }) => {
      setImmediate(() => app.quit());
    });
    await closed;
    for (const pid of pids) await expect.poll(() => dead(pid)).toBe(true);
  } finally {
    await cleanupDesktop(app, data);
  }
});

test("native reload cancellation retains text and discard reloads saved trial state", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-dirty-reload-",
    ),
  );
  const app = await launch(data);
  try {
    const page = await editTrial(app);
    await answerDiscard(app, 0);
    await app.evaluate(({ Menu, BrowserWindow }) => {
      const item = Menu.getApplicationMenu()
        .items.find((item) => item.label === "View")
        .submenu.items.find(
          (item) => item.label === "Reload" || item.role === "reload",
        );
      item.click(item, BrowserWindow.getAllWindows()[0]);
    });
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    // Keyboard shortcuts must use the same native guard, not Chromium's default reload.
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+r" : "Control+r",
    );
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    await page.keyboard.press("F5");
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+Shift+r" : "Control+Shift+r",
    );
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    await answerDiscard(app, 1);
    const loaded = page.waitForEvent("load");
    await app.evaluate(({ Menu, BrowserWindow }) => {
      const item = Menu.getApplicationMenu()
        .items.find((item) => item.label === "View")
        .submenu.items.find(
          (item) => item.label === "Reload" || item.role === "reload",
        );
      item.click(item, BrowserWindow.getAllWindows()[0]);
    });
    await loaded;
    await page
      .getByRole("button", { name: /Resume NATIVE-DIRTY.*main break/ })
      .click();
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(savedNotes);
    expect((await fetch(new URL(page.url()).origin + "/health")).ok).toBe(true);
    await answerDiscard(app, 0);
    const closed = app.waitForEvent("close");
    await app.evaluate(({ app }) => {
      setImmediate(() => app.quit());
    });
    await closed;
  } finally {
    await cleanupDesktop(app, data);
  }
});

test("native window close cancellation preserves draft, discard closes application", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-dirty-close-",
    ),
  );
  const app = await launch(data);
  try {
    const page = await editTrial(app);
    const origin = new URL(page.url()).origin;
    const pids = await backendPids(app);
    await answerDiscard(app, 0);
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].close();
    });
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    expect((await fetch(origin + "/health")).ok).toBe(true);
    await answerDiscard(app, 1);
    const closed = app.waitForEvent("close");
    await app.evaluate(({ BrowserWindow }) => {
      setImmediate(() => BrowserWindow.getAllWindows()[0].close());
    });
    await closed;
    for (const pid of pids) await expect.poll(() => dead(pid)).toBe(true);
  } finally {
    await cleanupDesktop(app, data);
  }
});

test("dirty bridge rejects malformed values and other windows, saving clears native protection", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-dirty-ipc-",
    ),
  );
  const app = await launch(data);
  try {
    const page = await editTrial(app);
    for (const value of [null, "false", 0, {}]) {
      const error = await page.evaluate(async (value) => {
        try {
          await window.leaklensDesktop.setDirty(value);
          return "accepted";
        } catch (error) {
          return error.message;
        }
      }, value);
      expect(error).toContain("Dirty state must be a boolean");
    }
    const untrusted = await app.evaluate(
      async ({ BrowserWindow, app }, origin) => {
        const other = new BrowserWindow({
          show: false,
          webPreferences: {
            preload: app.getAppPath() + "/src/preload.cjs",
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
          },
        });
        try {
          await other.loadURL(origin + "/operations");
          return await other.webContents.executeJavaScript(`
          window.leaklensDesktop.setDirty(false).then(() => "accepted", error => error.message)
        `);
        } finally {
          other.destroy();
        }
      },
      new URL(page.url()).origin,
    );
    expect(untrusted).toContain("Untrusted desktop request");
    await answerDiscard(app, 0);
    await app.evaluate(({ app }) => {
      app.quit();
    });
    await expect(
      page.getByLabel("Investigation and remaining uncertainty", {
        exact: true,
      }),
    ).toHaveValue(draftNotes);
    await page
      .getByRole("button", { name: "Save investigation notes", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Save investigation notes",
        exact: true,
      }),
    ).toBeDisabled();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const pids = await backendPids(app);
    const closed = app.waitForEvent("close");
    await app.evaluate(({ app }) => {
      setImmediate(() => app.quit());
    });
    await closed;
    for (const pid of pids) await expect.poll(() => dead(pid)).toBe(true);
  } finally {
    await cleanupDesktop(app, data);
  }
});

test("backend crash can terminate a dirty desktop without a discard loop", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-dirty-crash-",
    ),
  );
  const app = await launch(data);
  try {
    await editTrial(app);
    const pids = await backendPids(app);
    expect(pids.length).toBeGreaterThan(0);
    await answerDiscard(app, 0);
    await app.evaluate(({ dialog }) => {
      dialog.showErrorBox = () => {};
    });
    const closed = app.waitForEvent("close");
    for (const pid of pids) process.kill(pid, "SIGKILL");
    await closed;
    for (const pid of pids) await expect.poll(() => dead(pid)).toBe(true);
  } finally {
    await cleanupDesktop(app, data);
  }
});

test("desktop downloads real JSON and CSV trial exports", async () => {
  const data = fs.mkdtempSync(
    path.join(
      process.env.JCODE_SCRATCH_DIR || os.tmpdir(),
      "confluence-exports-",
    ),
  );
  const app = await launch(data);
  try {
    const page = await editTrial(app);
    await page
      .getByRole("button", { name: "Save investigation notes", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Save investigation notes",
        exact: true,
      }),
    ).toBeDisabled();
    for (const format of ["json", "csv"]) {
      const output = path.join(data, "trial." + format);
      // Set the download destination in main rather than interacting with a native Save dialog.
      await app.evaluate(({ BrowserWindow }, output) => {
        const window = BrowserWindow.getAllWindows()[0];
        window.testDownloadState = "pending";
        window.webContents.session.once("will-download", (_event, item) => {
          item.setSavePath(output);
          item.once("done", (_event, state) => {
            window.testDownloadState = state;
          });
        });
      }, output);
      await page
        .getByRole("button", {
          name: "Export " + format.toUpperCase(),
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          app.evaluate(
            ({ BrowserWindow }) =>
              BrowserWindow.getAllWindows()[0].testDownloadState,
          ),
        )
        .toBe("completed");
      const text = fs.readFileSync(output, "utf8");
      expect(text).toContain("NATIVE-DIRTY");
      if (format === "json") {
        const trial = JSON.parse(text);
        expect(trial.provenance).toBe("simulated");
        expect(trial.notes).toBe(draftNotes);
        expect(trial.schema_version).toBe(1);
        expect(trial.app_version).toBe("0.2.0");
        expect(trial.source_hashes["events.py"].status).toBe("available");
        expect(trial.source_hashes["events.py"].sha256).toMatch(
          /^[0-9a-f]{64}$/,
        );
      } else {
        expect(text).toContain("notes");
        expect(text.split("\n").length).toBeGreaterThan(2);
      }
    }
  } finally {
    await cleanupDesktop(app, data);
  }
});
