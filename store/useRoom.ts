"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activePlayerId, cpuChooseId, isCpuTurn } from "@/lib/game/cpu";
import { getClientId, getSavedName, uuid } from "@/lib/clientId";
import {
  createRoomState,
  roomReducer,
  seatForClient,
  type RoomAction,
  type RoomState,
} from "@/lib/room";
import { getSupabase } from "@/lib/supabaseClient";

const MAX_RETRIES = 6;
const CPU_DELAY_MS = 750;

export type RoomStatus = "connecting" | "ready" | "error";

export interface UseRoom {
  state: RoomState | null;
  status: RoomStatus;
  error: string | null;
  clientId: string;
  online: boolean;
  /** True when this client owns the seat that must act next. */
  isMyTurn: boolean;
  dispatch: (action: RoomAction) => void;
}

export function useRoom(code: string): UseRoom {
  const supabase = getSupabase();
  const online = supabase !== null;

  const [state, setState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const clientIdRef = useRef<string>("");
  const stateRef = useRef<RoomState | null>(null);
  const versionRef = useRef<number>(0);
  const roomIdRef = useRef<string | null>(null);
  const joinedRef = useRef(false);

  if (!clientIdRef.current) clientIdRef.current = getClientId();
  const clientId = clientIdRef.current;

  const setBoth = useCallback((next: RoomState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // --- persistence -------------------------------------------------------

  const persistOnline = useCallback(
    async (action: RoomAction) => {
      if (!supabase) return;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const base = stateRef.current;
        if (!base) return;
        const next = roomReducer(base, action);
        if (next === base) return; // no-op / invalid

        const { data, error: upErr } = await supabase
          .from("rooms")
          .update({
            state: next,
            version: versionRef.current + 1,
            status: next.phase,
            seed: next.seed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roomIdRef.current)
          .eq("version", versionRef.current)
          .select("version,state");

        if (upErr) {
          setError(upErr.message);
          return;
        }
        if (data && data.length > 0) {
          versionRef.current = data[0].version as number;
          setBoth(data[0].state as RoomState);
          return;
        }
        // Version conflict: reload latest and retry.
        const { data: fresh } = await supabase
          .from("rooms")
          .select("version,state")
          .eq("id", roomIdRef.current)
          .single();
        if (fresh) {
          versionRef.current = fresh.version as number;
          stateRef.current = fresh.state as RoomState;
        }
      }
    },
    [supabase, setBoth],
  );

  const dispatch = useCallback(
    (action: RoomAction) => {
      if (online) {
        void persistOnline(action);
      } else {
        const base = stateRef.current;
        if (!base) return;
        const next = roomReducer(base, action);
        if (next !== base) setBoth(next);
      }
    },
    [online, persistOnline, setBoth],
  );

  // --- connect -----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;

    async function connect() {
      if (!supabase) {
        // Local mode: create an in-memory room with this client as host.
        const fresh = createRoomState(clientId, `${code}-local`);
        setBoth(fresh);
        setStatus("ready");
        return;
      }

      try {
        // Find or create the room row for this code.
        const existing = await supabase
          .from("rooms")
          .select("id,version,state")
          .eq("code", code)
          .maybeSingle();

        let roomId: string;
        if (existing.data) {
          roomId = existing.data.id as string;
          versionRef.current = existing.data.version as number;
          stateRef.current = existing.data.state as RoomState;
        } else {
          const initial = createRoomState(clientId, `${code}-${uuid().slice(0, 8)}`);
          const inserted = await supabase
            .from("rooms")
            .insert({
              code,
              host_client_id: clientId,
              status: initial.phase,
              seed: initial.seed,
              state: initial,
              version: 1,
            })
            .select("id,version,state")
            .single();
          if (inserted.error) {
            // Likely a race: another client created it first. Re-read.
            const retry = await supabase
              .from("rooms")
              .select("id,version,state")
              .eq("code", code)
              .single();
            if (retry.error) throw retry.error;
            roomId = retry.data.id as string;
            versionRef.current = retry.data.version as number;
            stateRef.current = retry.data.state as RoomState;
          } else {
            roomId = inserted.data.id as string;
            versionRef.current = inserted.data.version as number;
            stateRef.current = inserted.data.state as RoomState;
          }
        }

        if (cancelled) return;
        roomIdRef.current = roomId;
        setBoth(stateRef.current!);
        setStatus("ready");

        channel = supabase
          .channel(`room:${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "rooms",
              filter: `id=eq.${roomId}`,
            },
            (payload) => {
              const row = payload.new as { version: number; state: RoomState };
              if (row.version >= versionRef.current) {
                versionRef.current = row.version;
                setBoth(row.state);
              }
            },
          )
          .subscribe();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // --- auto-join my seat once in the lobby -------------------------------

  useEffect(() => {
    if (!state || joinedRef.current) return;
    if (state.phase !== "lobby") return;
    if (seatForClient(state, clientId)) {
      joinedRef.current = true;
      return;
    }
    joinedRef.current = true;
    dispatch({
      type: "JOIN",
      clientId,
      seatId: uuid(),
      name: getSavedName() || "プレイヤー",
    });
  }, [state, clientId, dispatch]);

  // --- host drives CPU turns --------------------------------------------

  useEffect(() => {
    if (!state || state.phase !== "playing" || !state.game) return;
    const iAmHost = state.hostClientId === clientId;
    if (!iAmHost) return; // only the host advances CPUs to avoid races
    if (!isCpuTurn(state.game)) return;

    const game = state.game;
    const timer = setTimeout(() => {
      if (game.pending) {
        const choiceId = cpuChooseId(game);
        if (choiceId) {
          dispatch({
            type: "GAME",
            action: {
              type: "CHOOSE",
              playerId: game.pending.playerId,
              choiceId,
            },
          });
        }
      } else {
        const current = game.turnOrder[game.currentTurnIndex];
        dispatch({ type: "GAME", action: { type: "ROLL", playerId: current } });
      }
    }, CPU_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, clientId, dispatch]);

  const myTurn = (() => {
    if (!state?.game) return false;
    const active = activePlayerId(state.game);
    if (!active) return false;
    const seat = state.game.players[active];
    if (!seat || seat.isCpu) return false;
    // Map the acting game player back to the seat's owning client.
    const roomSeat = state.seats.find((s) => s.id === active);
    return roomSeat?.clientId === clientId;
  })();

  return {
    state,
    status,
    error,
    clientId,
    online,
    isMyTurn: myTurn,
    dispatch,
  };
}
