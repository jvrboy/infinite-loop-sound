// Phase 4 — Chat history + artifacts + usage hooks.
// Storage is localStorage-first (works offline + before auth) with a documented
// path to Supabase mirroring (see supabase/migrations/*_chats_artifacts_usage.sql).
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
const ARTIFACTS_KEY = "diq.chat.artifacts.v1";
const USAGE_KEY = "diq.chat.usage.v1";

const safeRead = <T>(k: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (k: string, v: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    setThreads(safeRead<Thread[]>(THREADS_KEY, []));
  }, []);

  const persist = useCallback((t: Thread[]) => {
    setThreads(t);
    safeWrite(THREADS_KEY, t);
  }, []);

  const create = useCallback(
    (title = "New chat"): Thread => {
      const t: Thread = {
        id: crypto.randomUUID(),
        title,
        messages: [],
        updated: Date.now(),
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
      persist(threads.filter((t) => t.id !== id));
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

  return { threads, persist, create, update, remove, togglePin, toggleArchive };
}

export function useArtifacts(threadId?: string | null) {
  const [all, setAll] = useState<Artifact[]>([]);
  useEffect(() => {
    setAll(safeRead<Artifact[]>(ARTIFACTS_KEY, []));
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
    setEvents(safeRead<UsageEvent[]>(USAGE_KEY, []));
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
