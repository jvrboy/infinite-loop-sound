// IndexedDB-backed library of saved sounds.
const DB_NAME = "infinite-sound";
const STORE = "sounds";

export interface LibrarySound {
  id: string;
  name: string;
  createdAt: number;
  buffer: ArrayBuffer; // serialized WAV
  meta: {
    duration: number;
    loopStart?: number;
    loopEnd?: number;
    loopType?: string;
    tags?: string[];
    parentId?: string;
  };
}

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveToLibrary(sound: LibrarySound): Promise<void> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(sound);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function listLibrary(): Promise<LibrarySound[]> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res((req.result as LibrarySound[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => rej(req.error);
  });
}

export async function deleteFromLibrary(id: string): Promise<void> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
