// File System Access API for the "Infinite Folder" sync.
const HANDLE_DB = "infinite-sound-handles";
const STORE = "h";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(HANDLE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function get<T>(key: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result as T);
    r.onerror = () => rej(r.error);
  });
}
async function set(key: string, value: unknown): Promise<void> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export const FOLDER_SUPPORTED = typeof window !== "undefined" && "showDirectoryPicker" in window;

const SUBFOLDERS = ["My Designs", "Imported", "Resampled", "Packs", "Temp"];

export async function pickInfiniteFolder(): Promise<string | null> {
  if (!FOLDER_SUPPORTED) return null;
  const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
  for (const sub of SUBFOLDERS) {
    await handle.getDirectoryHandle(sub, { create: true });
  }
  await set("root", handle);
  await set("rootName", handle.name);
  return handle.name;
}

export async function getInfiniteFolderName(): Promise<string | null> {
  return (await get<string>("rootName")) ?? null;
}

export async function getRootHandle(): Promise<any | null> {
  const h = await get<any>("root");
  if (!h) return null;
  // verify permission
  try {
    const perm = await h.queryPermission?.({ mode: "readwrite" });
    if (perm !== "granted") {
      const req = await h.requestPermission?.({ mode: "readwrite" });
      if (req !== "granted") return null;
    }
  } catch {}
  return h;
}

export async function writeWavToFolder(
  subfolder: string,
  filename: string,
  blob: Blob,
): Promise<{ ok: boolean; reason?: string }> {
  const root = await getRootHandle();
  if (!root) return { ok: false, reason: "no-root" };
  try {
    const dir = await root.getDirectoryHandle(subfolder, { create: true });
    const file = await dir.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
