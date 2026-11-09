import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { initDatabase } from "./db/database.js";
import { registerTemplatesIPC } from "./ipc/templates.js";
import { registerBibleIPC } from "./ipc/bible.js";
import { registerOutputIPC } from "./ipc/output.js";
import { registerSettingsIPC } from "./ipc/settings.js";
import { createOperatorWindow } from "./windows/operatorWindow.js";
import {
  createOutputWindow,
  destroyOutputWindow,
  getOutputWindow,
} from "./windows/outputWindow.js";
import { createStageWindow } from "./windows/stageWindow.js";
import { startRemoteServer } from "./remote/server.js";
import { registerServicesIPC } from "./ipc/services.js";
import { registerSongsIPC } from "./ipc/songs.js";
import { registerRemoteIPC } from "./ipc/remote.js";
import { protocol } from "electron";
import { registerMediaIPC } from "./ipc/media.js";
import { screen } from "electron";

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preloadPath = path.join(__dirname, "preload.cjs");
console.log("[main] Preload path:", preloadPath);
console.log("[main] Preload exists:", fs.existsSync(preloadPath));

const isDev = !app.isPackaged;

app.whenReady().then(async () => {
  await initDatabase();

  registerBibleIPC();
  registerOutputIPC();
  registerSettingsIPC();
  registerServicesIPC();
  registerSongsIPC();
  registerMediaIPC();

  registerRemoteIPC();

  createOperatorWindow();
  startRemoteServer();

  const operatorWin = BrowserWindow.getAllWindows()[0];
  if (operatorWin) {
    operatorWin.webContents.on("preload-error", (event, preloadPath, error) => {
      console.error("[main] PRELOAD ERROR:", preloadPath, error);
    });
    operatorWin.webContents.on("did-finish-load", () => {
      console.log("[main] operator window finished loading");
    });
    operatorWin.webContents.on("did-fail-load", (_e, code, desc, url) => {
      console.error("[main] operator window failed to load:", code, desc, url);
    });
  }

  protocol.registerFileProtocol("media", (request, callback) => {
    try {
      const url = new URL(request.url);
      // filePath will look like: /Users/JP/Desktop/.../video.mp4  (macOS/Linux)
      //                    or:  /C:/Users/.../video.mp4        (Windows)
      let filePath = decodeURIComponent(url.pathname);
      // On Windows, strip the leading slash before the drive letter
      if (process.platform === "win32") {
        filePath = filePath.replace(/^\//, "");
      }
      callback({ path: filePath });
    } catch (err) {
      console.error("[media protocol]", err);
      callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });

  setTimeout(() => {
    const wins = BrowserWindow.getAllWindows();
    console.log("[main] Open windows:", wins.length);
    wins.forEach((w, i) => {
      console.log(`[main] Window ${i}:`, {
        title: w.getTitle(),
        visible: w.isVisible(),
        focused: w.isFocused(),
        bounds: w.getBounds(),
        url: w.webContents.getURL(),
      });
    });
  }, 3000);

  // Panic key — instantly blank the output
  globalShortcut.register("CommandOrControl+Shift+B", () => {
    const win = getOutputWindow();
    if (win) win.webContents.send("output:blank-toggle");
  });

  // Emergency close — always works, even with output focused
  globalShortcut.register("CommandOrControl+Shift+Q", () => {
    const win = getOutputWindow();
    if (win) {
      win.allowClose = true;
      win.close();
    }
    // Also bring operator forward
    const operator = BrowserWindow.getAllWindows().find(
      (w) => w.getTitle() === "Church Presenter"
    );
    if (operator) {
      operator.show();
      operator.focus();
    }
  });

  // Emergency exit app entirely
  globalShortcut.register("CommandOrControl+Shift+Alt+Q", () => {
    app.exit(0);
  });

  screen.on("display-added", () => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send("displays:changed")
    );
  });
  screen.on("display-removed", () => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send("displays:changed")
    );
  });

  // Emergency — full blackout
  globalShortcut.register("CommandOrControl+Shift+E", () => {
    const win = getOutputWindow();
    if (win) win.webContents.send("output:emergency-black");
  });

  // Toggle output window
  globalShortcut.register("CommandOrControl+Shift+O", () => {
    const win = getOutputWindow();
    if (win) destroyOutputWindow();
    else createOutputWindow();
  });

  globalShortcut.register("CommandOrControl+Shift+X", () => {
    const win = getOutputWindow();
    if (win) win.webContents.send("output:emergency-clear");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createOperatorWindow();
  });
  registerTemplatesIPC();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Expose window creators over IPC so the operator can trigger them
// ipcMain.handle("window:create-output", (_e, displayId) => {
//   createOutputWindow(displayId);
// });
ipcMain.handle('window:create-output', async (_e, displayId) => {
  const win = createOutputWindow(displayId);

  // After the output window finishes loading, ask the operator to resend state
  win.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      const operator = BrowserWindow.getAllWindows().find(w => {
        try { return w.getTitle() === 'Church Presenter'; } catch { return false; }
      });
      if (operator) {
        operator.webContents.send('operator:rebroadcast-state');
      }
    }, 1200);
  });

  return true;
});

ipcMain.handle("window:destroy-output", () => {
  destroyOutputWindow();
});
ipcMain.handle("window:create-stage", (_e, displayId) => {
  createStageWindow(displayId);
});
