import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nativeAPI", {
  openFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke("dialog:openFile", filters),
  readBuffer: (filePath: string) => ipcRenderer.invoke("file:readBuffer", filePath),
  stat: (filePath: string) => ipcRenderer.invoke("file:stat", filePath),
  platform: process.platform,
  isElectron: true,
});
