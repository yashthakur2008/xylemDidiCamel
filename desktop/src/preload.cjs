const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "leaklensDesktop",
  Object.freeze({
    isDesktop: true,
    credentials: () => ipcRenderer.invoke("leaklens:credentials"),
    setDirty: (dirty) => ipcRenderer.invoke("leaklens:set-dirty", dirty),
  }),
);
