import { app, BrowserWindow, ipcMain, dialog, FileFilter } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn } from "child_process";

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0a0e1a",
    title: "Divergence IQ",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/client/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ============================================================
// App Folder — Creates a dedicated folder for user data on the device
// ============================================================

function getAppDataFolder(): string {
  const home = os.homedir();
  const folder = path.join(home, "Documents", "DivergenceIQ");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
}

ipcMain.handle("native:getAppFolder", async () => {
  return getAppDataFolder();
});

ipcMain.handle("native:getStorageInfo", async () => {
  try {
    const folder = getAppDataFolder();
    const stat = fs.statSync(folder);
    return { ok: true, appFolder: folder, usedBytes: stat.size, quotaBytes: 0, freeBytes: 0 };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

// ============================================================
// File System — Full read/write/list/delete/mkdir
// ============================================================

ipcMain.handle("native:listFiles", async (_event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const stat = await fs.promises.stat(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        size: stat.size,
        isDirectory: entry.isDirectory(),
        modified: stat.mtimeMs,
      };
    }));
    return files;
  } catch (err) {
    return [];
  }
});

ipcMain.handle("native:readFile", async (_event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { ok: true, data: buffer.buffer };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("native:writeFile", async (_event, filePath: string, data: ArrayBuffer) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(filePath, new Uint8Array(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("native:deleteFile", async (_event, filePath: string) => {
  try {
    await fs.promises.unlink(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("native:createDirectory", async (_event, dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

// ============================================================
// File Pickers — Native dialogs
// ============================================================

ipcMain.handle("dialog:openFile", async (_event, filters: FileFilter[]) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: filters.length ? filters : [{ name: "All Files", extensions: ["*"] }],
  });
  return result;
});

ipcMain.handle("dialog:openDirectory", async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result;
});

ipcMain.handle("dialog:saveFile", async (_event, defaultName: string, filters: FileFilter[]) => {
  if (!mainWindow) return { canceled: true, filePath: "" };
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters.length ? filters : [{ name: "All Files", extensions: ["*"] }],
  });
  return result;
});

// ============================================================
// Network — Download files and check connectivity
// ============================================================

ipcMain.handle("native:downloadFile", async (_event, url: string, destPath: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(destPath, buffer);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("native:openExternal", async (_event, filePath: string) => {
  try {
    await open(filePath);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to open" };
  }
});

// Keep legacy handlers for backward compat
ipcMain.handle("file:readBuffer", async (_event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { ok: true, data: buffer.buffer };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("file:stat", async (_event, filePath: string) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return { ok: true, size: stat.size, name: path.basename(filePath), modified: stat.mtimeMs };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});
