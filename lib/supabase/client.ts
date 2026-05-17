'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Returns null if env vars are missing — caller must handle (auth/sync disabled).
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn('[soluXYZon] Supabase env vars missing — running in guest-only mode.');
    }
    return null;
  }
  _client = createBrowserClient(url, key);
  return _client;
}

/** Convenience: true when Supabase is configured (env vars present). */
export function isSupabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
