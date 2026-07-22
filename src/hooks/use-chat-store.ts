// Phase 4 — Chat history + artifacts + usage hooks.
// Storage is localStorage-first (works offline + before auth) with a documented
// path to Supabase mirroring (see supabase/migrations/*_chats_artifacts_usage.sql).
// Extended: folders, clone, restore (trash), move chats between folders.
import { useCallback, useEffect, useState } from "react";

export type Msg = {
  role: "system" | "user" | "assistant";
  content: string;
  ts: number;
  provider?: string;
};

export interface Thread {
  id: string;
  title: string;
  messages: Msg[];
  updated: number;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  deletedAt?: number;
  folderId?: string | null;
  clonedFrom?: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: number;
}

export interface Artifact {
  id: string;
  threadId: string;
  name: string;
  kind: "json" | "csv" | "html" | "css" | "js" | "ts" | "py" | "md" | "pdf" | "txt" | "other";
  bytes: number;
  content: string;
  createdAt: number;
}

export interface UsageEvent {
  ts: number;
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  threadId?: string;
}

const THREADS_KEY = "diq.chat.threads.v1";
const FOLDERS_KEY = "diq.chat.folders.v1";
const ARTIFACTS_KEY = "diq.chat.artifacts.v1";
const USAGE_KEY = "diq.chat.usage.v1";

const safeRead = <T>(k: string, fallback: T, validate?: (value: unknown) => value is T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(k) || "null") ?? fallback;
    return validate && !validate(parsed) ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
};

const isArray = <T = unknown>(value: unknown): value is T[] => Array.isArray(value);

const safeWrite = (k: string, v: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    setThreads(safeRead<Thread[]>(THREADS_KEY, [], isArray));
  }, []);

  const persist = useCallback((t: Thread[]) => {
    setThreads(t);
    safeWrite(THREADS_KEY, t);
  }, []);

  const create = useCallback(
    (title = "New chat", folderId: string | null = null): Thread => {
      const t: Thread = {
        id: crypto.randomUUID(),
        title,
        messages: [],
        updated: Date.now(),
        folderId,
      };
      persist([t, ...threads]);
      return t;
    },
    [persist, threads],
  );

  const update = useCallback(
    (id: string, patch: Partial<Thread>) => {
      persist(threads.map((t) => (t.id === id ? { ...t, ...patch, updated: Date.now() } : t)));
    },
    [persist, threads],
  );

  const remove = useCallback(
    (id: string) => {
      persist(
        threads.map((t) =>
          t.id === id ? { ...t, deleted: true, deletedAt: Date.now(), pinned: false } : t,
        ),
      );
    },
    [persist, threads],
  );

  const hardRemove = useCallback(
    (id: string) => {
      persist(threads.filter((t) => t.id !== id));
    },
    [persist, threads],
  );

  const restore = useCallback(
    (id: string) => {
      persist(
        threads.map((t) => (t.id === id ? { ...t, deleted: false, deletedAt: undefined } : t)),
      );
    },
    [persist, threads],
  );

  const emptyTrash = useCallback(() => {
    persist(threads.filter((t) => !t.deleted));
  }, [persist, threads]);

  const clone = useCallback(
    (id: string): Thread | null => {
      const original = threads.find((t) => t.id === id);
      if (!original) return null;
      const copy: Thread = {
        ...original,
        id: crypto.randomUUID(),
        title: `${original.title} (clone)`,
        updated: Date.now(),
        pinned: false,
        archived: false,
        deleted: false,
        deletedAt: undefined,
        clonedFrom: id,
      };
      persist([copy, ...threads]);
      return copy;
    },
    [persist, threads],
  );

  const move = useCallback(
    (id: string, folderId: string | null) => {
      persist(threads.map((t) => (t.id === id ? { ...t, folderId, updated: Date.now() } : t)));
    },
    [persist, threads],
  );

  const togglePin = useCallback(
    (id: string) => {
      persist(
        threads.map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updated: Date.now() } : t)),
      );
    },
    [persist, threads],
  );

  const toggleArchive = useCallback(
    (id: string) => {
      persist(
        threads.map((t) =>
          t.id === id ? { ...t, archived: !t.archived, updated: Date.now() } : t,
        ),
      );
    },
    [persist, threads],
  );

  return {
    threads,
    persist,
    create,
    update,
    remove,
    hardRemove,
    restore,
    emptyTrash,
    clone,
    move,
    togglePin,
    toggleArchive,
  };
}

export function useFolders() {
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  useEffect(() => {
    setFolders(safeRead<ChatFolder[]>(FOLDERS_KEY, [], isArray));
  }, []);

  const persist = useCallback((f: ChatFolder[]) => {
    setFolders(f);
    safeWrite(FOLDERS_KEY, f);
  }, []);

  const create = useCallback(
    (name: string, color = "#3b82f6"): ChatFolder => {
      const f: ChatFolder = {
        id: crypto.randomUUID(),
        name,
        color,
        order: folders.length,
        createdAt: Date.now(),
      };
      persist([...folders, f]);
      return f;
    },
    [persist, folders],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      persist(folders.map((f) => (f.id === id ? { ...f, name } : f)));
    },
    [persist, folders],
  );

  const recolor = useCallback(
    (id: string, color: string) => {
      persist(folders.map((f) => (f.id === id ? { ...f, color } : f)));
    },
    [persist, folders],
  );

  const remove = useCallback(
    (id: string) => {
      persist(folders.filter((f) => f.id !== id));
    },
    [persist, folders],
  );

  const reorder = useCallback(
    (id: string, newOrder: number) => {
      const sorted = [...folders].sort((a, b) => a.order - b.order);
      const item = sorted.find((f) => f.id === id);
      if (!item) return;
      const filtered = sorted.filter((f) => f.id !== id);
      filtered.splice(newOrder, 0, { ...item, order: newOrder });
      persist(filtered.map((f, i) => ({ ...f, order: i })));
    },
    [persist, folders],
  );

  return { folders, persist, create, rename, recolor, remove, reorder };
}

export function useArtifacts(threadId?: string | null) {
  const [all, setAll] = useState<Artifact[]>([]);
  useEffect(() => {
    setAll(safeRead<Artifact[]>(ARTIFACTS_KEY, [], isArray));
  }, []);

  const persist = useCallback((a: Artifact[]) => {
    setAll(a);
    safeWrite(ARTIFACTS_KEY, a);
  }, []);

  const add = useCallback(
    (a: Omit<Artifact, "id" | "createdAt">) => {
      const full: Artifact = { ...a, id: crypto.randomUUID(), createdAt: Date.now() };
      persist([full, ...all]);
      return full;
    },
    [persist, all],
  );

  const remove = useCallback(
    (id: string) => persist(all.filter((a) => a.id !== id)),
    [persist, all],
  );

  const forThread = threadId ? all.filter((a) => a.threadId === threadId) : all;

  return { all, forThread, add, remove };
}

export function useUsage() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  useEffect(() => {
    setEvents(safeRead<UsageEvent[]>(USAGE_KEY, [], isArray));
  }, []);

  const track = useCallback((e: UsageEvent) => {
    setEvents((prev) => {
      const next = [e, ...prev].slice(0, 2000);
      safeWrite(USAGE_KEY, next);
      return next;
    });
  }, []);

  const totalTokens = events.reduce((a, e) => a + e.inputTokens + e.outputTokens, 0);
  const last24h = events.filter((e) => e.ts > Date.now() - 24 * 3600_000);
  const tokens24h = last24h.reduce((a, e) => a + e.inputTokens + e.outputTokens, 0);
  const byProvider = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.provider] = (acc[e.provider] || 0) + e.inputTokens + e.outputTokens;
    return acc;
  }, {});

  return { events, track, totalTokens, tokens24h, byProvider };
}
