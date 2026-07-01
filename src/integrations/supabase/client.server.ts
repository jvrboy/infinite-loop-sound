// Server-side Supabase admin client — production-hardened.
// Bypasses RLS via the service-role key; degrades to a stub when env is
// missing instead of throwing, so SSR for routes that don't use it still works.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

let _client: SupabaseClient<Database> | null = null;
let _warned = false;
function warnOnce() {
  if (_warned) return;
  _warned = true;

  console.warn(
    "[Supabase admin] Not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your server environment to enable admin operations.",
  );
}

function stubResult(method: string) {
  return Promise.resolve({
    data: null,
    error: {
      message: `Supabase admin not configured (${method})`,
      name: "SupabaseAdminNotConfigured",
    },
  });
}

function createStub(): SupabaseClient<Database> {
  const q: any = {
    select: () => q,
    insert: () => stubResult("insert"),
    update: () => stubResult("update"),
    upsert: () => stubResult("upsert"),
    delete: () => stubResult("delete"),
    eq: () => q,
    in: () => q,
    order: () => q,
    limit: () => q,
    single: () => stubResult("single"),
    maybeSingle: () => stubResult("maybeSingle"),
    then: (r: any) => stubResult("select").then(r),
  };
  return {
    from: () => {
      warnOnce();
      return q;
    },
    rpc: () => {
      warnOnce();
      return stubResult("rpc");
    },
    auth: {
      admin: {
        getUserById: async () => {
          warnOnce();
          return { data: { user: null }, error: null };
        },
        listUsers: async () => {
          warnOnce();
          return { data: { users: [] }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient<Database>;
}

function getOrCreate(): SupabaseClient<Database> {
  if (_client) return _client;
  if (!isSupabaseAdminConfigured()) {
    warnOnce();
    _client = createStub();
    return _client;
  }
  _client = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    return Reflect.get(getOrCreate(), prop, receiver);
  },
});
