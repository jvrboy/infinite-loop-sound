import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type Row = Record<string, any>;

type SelectOptions = {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  eq?: Record<string, any>;
  neq?: Record<string, any>;
};

const PREFIX = "diq.store.";
const MAX_LOCAL = 500;

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLocal<T extends Row>(table: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T extends Row>(table: string, rows: T[]): void {
  try {
    const trimmed = rows.slice(0, MAX_LOCAL);
    localStorage.setItem(PREFIX + table, JSON.stringify(trimmed));
  } catch {}
}

function matches(row: Row, eq?: Record<string, any>, neq?: Record<string, any>): boolean {
  if (eq) for (const k in eq) if (row[k] !== eq[k]) return false;
  if (neq) for (const k in neq) if (row[k] === neq[k]) return false;
  return true;
}

export const store = {
  async select<T extends Row = Row>(table: string, opts: SelectOptions = {}): Promise<T[]> {
    if (isSupabaseConfigured()) {
      let q = supabase.from(table).select("*");
      if (opts.eq) for (const k in opts.eq) q = q.eq(k, opts.eq[k]);
      if (opts.neq) for (const k in opts.neq) q = q.neq(k, opts.neq[k]);
      if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? true });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    }
    let rows = readLocal<T>(table).filter((r) => matches(r, opts.eq, opts.neq));
    if (opts.orderBy) {
      rows.sort((a, b) => {
        const av = a[opts.orderBy!], bv = b[opts.orderBy!];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return opts.ascending ? cmp : -cmp;
      });
    }
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return rows;
  },

  async insert<T extends Row = Row>(table: string, row: Partial<T>): Promise<T> {
    const full = { id: uid(), created_at: new Date().toISOString(), ...row } as T;
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from(table).insert(full).select().single();
      if (error) throw error;
      return data as T;
    }
    const rows = readLocal<T>(table);
    rows.unshift(full);
    writeLocal(table, rows);
    return full;
  },

  async update<T extends Row = Row>(table: string, id: string, patch: Partial<T>): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) throw error;
      return;
    }
    const rows = readLocal<T>(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...patch };
      writeLocal(table, rows);
    }
  },

  async updateWhere<T extends Row = Row>(
    table: string,
    where: Record<string, any>,
    patch: Partial<T>
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      let q = supabase.from(table).update(patch);
      for (const k in where) q = q.eq(k, where[k]);
      const { error } = await q;
      if (error) throw error;
      return;
    }
    const rows = readLocal<T>(table);
    for (const r of rows) if (matches(r, where)) Object.assign(r, patch);
    writeLocal(table, rows);
  },

  async delete(table: string, id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return;
    }
    const rows = readLocal<Row>(table).filter((r) => r.id !== id);
    writeLocal(table, rows);
  },

  async deleteWhere(table: string, where: Record<string, any>): Promise<void> {
    if (isSupabaseConfigured()) {
      let q = supabase.from(table).delete();
      for (const k in where) q = q.eq(k, where[k]);
      const { error } = await q;
      if (error) throw error;
      return;
    }
    const rows = readLocal<Row>(table).filter((r) => !matches(r, where));
    writeLocal(table, rows);
  },

  isOnline(): boolean {
    return isSupabaseConfigured() && typeof navigator !== "undefined" && navigator.onLine;
  },
};
