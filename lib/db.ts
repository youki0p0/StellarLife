import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createRoomState, type RoomState } from "./room";
import { getSupabase } from "./supabaseClient";
import { uuid } from "./clientId";

// Supabase room persistence, extracted into its own module to mirror the
// StellarBurst layout. Realtime sync is broadcast-primary: after a write the
// author broadcasts the new {version,state} to peers (no RLS/publication
// dependency), with postgres_changes as a secondary path and periodic polling
// as a final fallback. This is more robust than relying on postgres_changes
// alone, which needs the table in the realtime publication and can lag.

export interface RoomRow {
  id: string;
  version: number;
  state: RoomState;
}

const POLL_INTERVAL_MS = 4000;
const SELECT = "id,version,state";

// Live broadcast channels keyed by room id, so persistState can poke peers.
const channels = new Map<string, RealtimeChannel>();

function client(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function loadRoomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await client()
    .from("rooms")
    .select(SELECT)
    .eq("code", code)
    .maybeSingle();
  // PGRST116 == "no rows"; treat as not-found rather than an error.
  if (error && error.code !== "PGRST116") {
    throw new Error(`ルーム検索に失敗: ${error.message}`);
  }
  return data ? (data as RoomRow) : null;
}

export async function loadRoomById(id: string): Promise<RoomRow | null> {
  const { data, error } = await client()
    .from("rooms")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw new Error(`ルーム取得に失敗: ${error.message}`);
  }
  return data ? (data as RoomRow) : null;
}

export async function createRoom(
  code: string,
  hostClientId: string,
): Promise<RoomRow> {
  const initial = createRoomState(hostClientId, `${code}-${uuid().slice(0, 8)}`);
  const { data, error } = await client()
    .from("rooms")
    .insert({
      code,
      host_client_id: hostClientId,
      status: initial.phase,
      seed: initial.seed,
      state: initial,
      version: 1,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(`ルーム作成に失敗: ${error.message}`);
  return data as RoomRow;
}

/** Load the room for a code, creating it (host = this client) if absent. */
export async function findOrCreateRoom(
  code: string,
  hostClientId: string,
): Promise<RoomRow> {
  const existing = await loadRoomByCode(code);
  if (existing) return existing;
  try {
    return await createRoom(code, hostClientId);
  } catch {
    // Lost a create race on the unique code — re-read the winner's row.
    const row = await loadRoomByCode(code);
    if (row) return row;
    throw new Error("ルームの作成と再取得に失敗しました");
  }
}

export type PersistResult =
  | { status: "ok"; row: RoomRow }
  | { status: "conflict" }
  | { status: "error"; error: string };

/** Optimistic, version-checked update. Broadcasts the new row to peers on success. */
export async function persistState(
  roomId: string,
  expectedVersion: number,
  next: RoomState,
): Promise<PersistResult> {
  const nextVersion = expectedVersion + 1;
  const { data, error } = await client()
    .from("rooms")
    .update({
      state: next,
      version: nextVersion,
      status: next.phase,
      seed: next.seed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("version", expectedVersion)
    .select(SELECT);

  if (error) return { status: "error", error: error.message };
  if (!data || data.length === 0) return { status: "conflict" };

  const row = data[0] as RoomRow;
  // Primary realtime path: tell peers directly.
  channels.get(roomId)?.send({
    type: "broadcast",
    event: "sync",
    payload: row,
  });
  return { status: "ok", row };
}

/**
 * Subscribe to a room via three paths that all funnel to onChange:
 *   1. broadcast "sync" (primary)
 *   2. postgres_changes UPDATE (secondary)
 *   3. periodic polling (fallback)
 * Returns an unsubscribe function.
 */
export function subscribeRoom(
  roomId: string,
  onChange: (row: RoomRow) => void,
): () => void {
  const supabase = client();
  const channel = supabase.channel(`room:${roomId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "sync" }, ({ payload }) => {
    onChange(payload as RoomRow);
  });

  channel.on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    },
    (p) => {
      const row = p.new as { id: string; version: number; state: RoomState };
      onChange({ id: roomId, version: row.version, state: row.state });
    },
  );

  channel.subscribe();
  channels.set(roomId, channel);

  const poll = setInterval(() => {
    loadRoomById(roomId)
      .then((row) => {
        if (row) onChange(row);
      })
      .catch(() => {
        /* transient; next tick retries */
      });
  }, POLL_INTERVAL_MS);

  return () => {
    clearInterval(poll);
    channels.delete(roomId);
    void supabase.removeChannel(channel);
  };
}
