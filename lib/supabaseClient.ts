import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// A single browser client, created lazily. When the env vars are absent the
// game runs in LOCAL mode (single device) and this returns null everywhere.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return cached;
}

export function isOnline(): boolean {
  return getSupabase() !== null;
}
