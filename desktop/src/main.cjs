const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { startBackend } = require("./backend.cjs");
let backend,
  window,
  quitting = false;
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
    if (!quitting && backend) {
      event.preventDefault();
      quitting = true;
      backend.stop().finally(() => app.quit());
    }
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
        title: "LeakLens",
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
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "LeakLens",
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
              { role: "reload" },
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
        if (
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          new URL(event.senderFrame.url).origin !== backend.origin
        )
          throw new Error("Untrusted desktop request");
        return backend.tokens;
      });
      await window.loadURL(backend.origin + "/operations");
      window.show();
      backend.exited.then(() => {
        if (!quitting) {
          dialog.showErrorBox(
            "LeakLens backend stopped",
            "Your saved data remains on this computer. Close and reopen LeakLens to continue.",
          );
          app.quit();
        }
      });
    } catch (error) {
      dialog.showErrorBox(
        "LeakLens could not start",
        `${error.message}\nNo developer tools are required. Reinstall the complete application if its bundled files are missing.`,
      );
      app.quit();
    }
  });
}
