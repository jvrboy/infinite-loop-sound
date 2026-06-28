// Supabase browser client — production-hardened.
//
// Why this file changed:
// - Previously the client `throw`-on-missing-env, which crashed the entire
//   app on first import (any route that touches supabase). On a fresh clone,
//   on Hugging Face Spaces without secrets configured, and during SSR with
//   no env injected, this produced the error:
//     `Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`
// - Now we degrade gracefully: a Proxy returns a no-op client that surfaces
//   a single clear console.warn the first time anyone accesses it, and
//   queries resolve to `{ data: null, error }` instead of throwing. Features
//   that don't require supabase keep working (deriv data, detectors, chat
//   skills, calculators, etc.).
// - `isSupabaseConfigured()` lets callers branch (e.g. "Sign in" button can
//   show a setup hint instead of a crash).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function readEnv(name: string): string | undefined {
  try {
    // Vite injects import.meta.env at build time; process.env is for SSR.
    const fromMeta = (import.meta as any)?.env?.[name];
    if (fromMeta) return String(fromMeta);
  } catch { /* ignore */ }
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return String(process.env[name]);
  }
  return undefined;
}

const SUPABASE_URL =
  readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
const SUPABASE_PUBLISHABLE_KEY =
  readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  readEnv("SUPABASE_PUBLISHABLE_KEY") ||
  readEnv("VITE_SUPABASE_ANON_KEY");

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

let _supabase: SupabaseClient<Database> | null = null;
let _warned = false;

function warnOnce() {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY for SSR) to enable database features. See .env.example.",
  );
}

function stubResult(method: string) {
  return { data: null, error: { message: `Supabase not configured (${method})`, name: "SupabaseNotConfigured" } };
}

function createStubClient(): SupabaseClient<Database> {
  const q: any = {
    select: () => q,
    insert: () => Promise.resolve(stubResult("insert")),
    update: () => Promise.resolve(stubResult("update")),
    upsert: () => Promise.resolve(stubResult("upsert")),
    delete: () => Promise.resolve(stubResult("delete")),
    eq: () => q, in: () => q, is: () => q, gt: () => q, gte: () => q, lt: () => q, lte: () => q,
    order: () => q, limit: () => q, range: () => q,
    single: () => Promise.resolve(stubResult("single")),
    maybeSingle: () => Promise.resolve(stubResult("maybeSingle")),
    then: (r: any) => Promise.resolve(stubResult("select")).then(r),
  };
  const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => Promise.resolve("ok") };
  return {
    from: () => { warnOnce(); return q; },
    rpc: () => { warnOnce(); return Promise.resolve(stubResult("rpc")); },
    channel: () => { warnOnce(); return ch; },
    removeChannel: () => Promise.resolve("ok"),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => { warnOnce(); return stubResult("signIn"); },
      signInWithOAuth: async () => { warnOnce(); return stubResult("signInWithOAuth"); },
      signUp: async () => { warnOnce(); return stubResult("signUp"); },
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    functions: { invoke: async () => { warnOnce(); return stubResult("invoke"); } },
    storage: {
      from: () => ({
        upload: async () => { warnOnce(); return stubResult("upload"); },
        download: async () => { warnOnce(); return stubResult("download"); },
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        list: async () => stubResult("list"),
        remove: async () => stubResult("remove"),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

function getOrCreateClient(): SupabaseClient<Database> {
  if (_supabase) return _supabase;
  if (!isSupabaseConfigured()) {
    warnOnce();
    _supabase = createStubClient();
    return _supabase;
  }
  _supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    const client = getOrCreateClient();
    return Reflect.get(client, prop, receiver);
  },
});
