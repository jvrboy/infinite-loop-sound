import { app, BrowserWindow, ipcMain, dialog, FileFilter } from "electron";
import * as path from "path";
import * as fs from "fs";

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

// Native file picker for GGUF model loading (bypasses browser sandbox)
ipcMain.handle("dialog:openFile", async (_event, filters: FileFilter[]) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: filters.length ? filters : [{ name: "All Files", extensions: ["*"] }],
  });
  return result;
});

// Read a GGUF file as a Buffer for the WASM wllama runtime
ipcMain.handle("file:readBuffer", async (_event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { ok: true, data: buffer.buffer };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});

// Read file metadata (size, name) without loading the whole file
ipcMain.handle("file:stat", async (_event, filePath: string) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return {
      ok: true,
      size: stat.size,
      name: path.basename(filePath),
      modified: stat.mtimeMs,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});
