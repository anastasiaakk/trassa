const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trassaDesktop", {
  checkForUpdatesNow: async () => {
    const result = await ipcRenderer.invoke("trassa:check-updates-now");
    return result && typeof result === "object" ? result : { ok: false, error: "Неизвестный ответ" };
  },
});

window.addEventListener("DOMContentLoaded", () => {});