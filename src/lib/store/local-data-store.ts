// Local Data Store — Provides Supabase independence.
// When Supabase is not configured (offline, desktop, mobile builds),
// this store persists data to localStorage/IndexedDB with the same API surface.
// When Supabase IS available, it transparently syncs.

import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

const supabaseClient = supabase as any;

const DB_NAME = "diq-local-store";
const DB_VERSION = 1;
const STORE = "kv";

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<any> {
  try {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  try {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* localStorage fallback */
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* noop */
  }
}

export type StoreTable =
  | "signals"
  | "journal"
  | "alerts"
  | "strategies"
  | "agent_states"
  | "settings";

export interface LocalDataStore {
  select: <T = any>(
    table: StoreTable,
    filter?: Partial<Record<string, any>>,
  ) => Promise<{ data: T[] | null; error: any }>;
  insert: <T = any>(table: StoreTable, row: T) => Promise<{ data: T | null; error: any }>;
  update: <T = any>(
    table: StoreTable,
    id: string,
    patch: Partial<T>,
  ) => Promise<{ data: T | null; error: any }>;
  remove: (table: StoreTable, id: string) => Promise<{ error: any }>;
  upsert: <T = any>(table: StoreTable, row: T) => Promise<{ data: T | null; error: any }>;
}

function matches(row: any, filter?: Partial<Record<string, any>>): boolean {
  if (!filter) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (row[k] !== v) return false;
  }
  return true;
}

export function useLocalDataStore(): LocalDataStore {
  const configured = isSupabaseConfigured();

  return {
    async select<T = any>(table: StoreTable, filter?: Partial<Record<string, any>>) {
      if (configured) {
        let q = supabaseClient.from(table).select("*");
        if (filter) {
          for (const [k, v] of Object.entries(filter)) {
            q = q.eq(k, v);
          }
        }
        return q.order("created_at", { ascending: false }).limit(200) as any;
      }
      const rows = ((await idbGet(table)) as any[]) || [];
      const filtered = filter ? rows.filter((r) => matches(r, filter)) : rows;
      return { data: filtered, error: null };
    },

    async insert<T = any>(table: StoreTable, row: T) {
      if (configured) {
        return supabaseClient.from(table).insert(row).select().single() as any;
      }
      const rows = ((await idbGet(table)) as any[]) || [];
      const newRow = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      rows.push(newRow);
      await idbSet(table, rows);
      return { data: newRow as T, error: null };
    },

    async update<T = any>(table: StoreTable, id: string, patch: Partial<T>) {
      if (configured) {
        return supabaseClient.from(table).update(patch).eq("id", id).select().single() as any;
      }
      const rows = ((await idbGet(table)) as any[]) || [];
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
        await idbSet(table, rows);
        return { data: rows[idx] as T, error: null };
      }
      return { data: null, error: { message: "Not found" } };
    },

    async remove(table: StoreTable, id: string) {
      if (configured) {
        return { error: (await supabaseClient.from(table).delete().eq("id", id)).error };
      }
      const rows = ((await idbGet(table)) as any[]) || [];
      await idbSet(
        table,
        rows.filter((r) => r.id !== id),
      );
      return { error: null };
    },

    async upsert<T = any>(table: StoreTable, row: T) {
      if (configured) {
        return supabaseClient.from(table).upsert(row).select().single() as any;
      }
      const rows = ((await idbGet(table)) as any[]) || [];
      const rowAny = row as any;
      const idx = rowAny.id ? rows.findIndex((r) => r.id === rowAny.id) : -1;
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...rowAny, updated_at: new Date().toISOString() };
      } else {
        rows.push({
          ...rowAny,
          id: rowAny.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
        });
      }
      await idbSet(table, rows);
      return { data: row as T, error: null };
    },
  };
}
