const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { startBackend } = require("./backend.cjs");
let backend,
  window,
  dirty = false,
  quitting = false,
  backendStopped = false;

function confirmDiscard() {
  if (!dirty || quitting) return true;
  const response = dialog.showMessageBoxSync(window, {
    type: "warning",
    title: "Unsaved changes",
    message: "Discard unsaved edits?",
    detail: "Your unsaved edits will be lost. Saved trial records are kept.",
    buttons: ["Keep editing", "Discard"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (response !== 1) return false;
  dirty = false;
  window.setDocumentEdited(false);
  return true;
}

function reloadWindow(ignoreCache = false) {
  if (quitting || !window || window.isDestroyed() || !confirmDiscard()) return;
  if (ignoreCache) window.webContents.reloadIgnoringCache();
  else window.webContents.reload();
}

function validateSender(event) {
  if (
    !window ||
    window.isDestroyed() ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    new URL(event.senderFrame.url).origin !== backend.origin
  )
    throw new Error("Untrusted desktop request");
}
// Preserve pre-Confluence installations and single-instance lock identity.
app.setPath("userData", path.join(app.getPath("appData"), "LeakLens"));
if (process.env.LEAKLENS_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.LEAKLENS_DATA_DIR));
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (quitting) {
      if (!backendStopped) event.preventDefault();
      return;
    }
    // A cancelled quit must leave both the editor and its backend alive.
    if (!confirmDiscard()) {
      event.preventDefault();
      return;
    }
    quitting = true;
    if (backend) {
      event.preventDefault();
      backend.stop().finally(() => {
        backendStopped = true;
        app.quit();
      });
    } else backendStopped = true;
  });
  app.whenReady().then(async () => {
    try {
      const root = path.resolve(__dirname, "../..");
      const resources = app.isPackaged
        ? process.resourcesPath
        : path.join(root, "desktop", "build");
      const executable = path.join(
        resources,
        "backend",
        process.platform === "win32"
          ? "leaklens-backend.exe"
          : "leaklens-backend",
      );
      const data = app.getPath("userData");
      fs.mkdirSync(data, { recursive: true });
      backend = await startBackend({
        executable,
        assets: app.isPackaged
          ? path.join(resources, "frontend")
          : path.join(root, "frontend", "dist"),
        dbPath: path.join(data, "demo.sqlite3"),
      });
      window = new BrowserWindow({
        width: 1280,
        height: 900,
        minWidth: 720,
        minHeight: 600,
        title: "Confluence",
        // Keep native traffic lights on macOS, and the standard OS frame elsewhere.
        ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" } : {}),
        backgroundColor: "#f7f6ef",
        show: false,
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          webSecurity: true,
          partition: "leaklens-desktop",
        },
      });
      // The web page has a descriptive marketing title, not a native window title.
      window.on("page-title-updated", (event) => event.preventDefault());
      window.on("close", (event) => {
        if (!confirmDiscard()) event.preventDefault();
      });
      window.webContents.on("before-input-event", (event, input) => {
        const reload =
          input.key === "F5" ||
          ((input.control || input.meta) && input.key.toLowerCase() === "r");
        if (input.type === "keyDown" && reload) {
          event.preventDefault();
          if (!input.isAutoRepeat) reloadWindow(input.shift);
        }
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "Confluence",
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
          { role: "editMenu" },
          {
            label: "View",
            submenu: [
              {
                label: "Reload",
                accelerator: "CmdOrCtrl+R",
                click: () => reloadWindow(),
              },
              { role: "resetZoom" },
              { role: "zoomIn" },
              { role: "zoomOut" },
              { role: "togglefullscreen" },
            ],
          },
        ]),
      );
      const session = window.webContents.session;
      session.setPermissionRequestHandler((_wc, _permission, callback) =>
        callback(false),
      );
      session.setPermissionCheckHandler(() => false);
      session.webRequest.onBeforeRequest((details, callback) => {
        callback({ cancel: !details.url.startsWith(backend.origin + "/") });
      });
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(backend.origin + "/")) event.preventDefault();
      });
      window.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      ipcMain.handle("leaklens:credentials", (event) => {
        validateSender(event);
        return backend.tokens;
      });
      ipcMain.handle("leaklens:set-dirty", (event, value) => {
        validateSender(event);
        if (typeof value !== "boolean")
          throw new TypeError("Dirty state must be a boolean");
        if (quitting) return;
        dirty = value;
        window.setDocumentEdited(dirty);
      });
      await window.loadURL(backend.origin + "/operations");
      window.show();
      backend.exited.then(() => {
        if (!quitting) {
          // A dead backend cannot save edits. Do not trap termination in a discard loop.
          dirty = false;
          dialog.showErrorBox(
            "Confluence backend stopped",
            "Your saved data remains on this computer. Close and reopen Confluence to continue.",
          );
          app.quit();
        }
      });
    } catch (error) {
      dialog.showErrorBox(
        "Confluence could not start",
        `${error.message}\nNo developer tools are required. Reinstall the complete application if its bundled files are missing.`,
      );
      app.quit();
    }
  });
}
