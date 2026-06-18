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
import {
  findOrCreateRoom,
  loadRoomById,
  persistState,
  subscribeRoom,
} from "@/lib/db";
import { isOnline } from "@/lib/supabaseClient";

const MAX_RETRIES = 6;
const CPU_DELAY_MS = 750;
/** If the initial connection has not resolved by this point, surface an error
 * instead of leaving the user stuck on an infinite "接続中" spinner. */
const CONNECT_TIMEOUT_MS = 12000;

/** Reject if a Supabase call hangs (paused project, network stall, CORS). */
function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} がタイムアウトしました (${CONNECT_TIMEOUT_MS / 1000}秒)`)),
      CONNECT_TIMEOUT_MS,
    );
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

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
  const online = isOnline();

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
      const roomId = roomIdRef.current;
      if (!roomId) return;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const base = stateRef.current;
        if (!base) return;
        const next = roomReducer(base, action);
        if (next === base) return; // no-op / invalid

        const res = await persistState(roomId, versionRef.current, next);
        if (res.status === "ok") {
          versionRef.current = res.row.version;
          setBoth(res.row.state);
          return;
        }
        if (res.status === "error") {
          setError(res.error);
          return;
        }
        // Version conflict: reload latest and retry against fresh state.
        const fresh = await loadRoomById(roomId);
        if (fresh) {
          versionRef.current = fresh.version;
          stateRef.current = fresh.state;
        }
      }
    },
    [setBoth],
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
    let unsubscribe: (() => void) | null = null;

    async function connect() {
      if (!online) {
        // Local mode: create an in-memory room with this client as host.
        const fresh = createRoomState(clientId, `${code}-local`);
        setBoth(fresh);
        setStatus("ready");
        return;
      }

      try {
        console.info("[stellar-life] online mode: connecting to room", code);
        const row = await withTimeout(
          findOrCreateRoom(code, clientId),
          "ルーム接続",
        );
        if (cancelled) return;

        roomIdRef.current = row.id;
        versionRef.current = row.version;
        setBoth(row.state);
        setStatus("ready");

        // broadcast (primary) + postgres_changes + polling, all via db.ts.
        unsubscribe = subscribeRoom(row.id, (incoming) => {
          if (incoming.version > versionRef.current) {
            versionRef.current = incoming.version;
            setBoth(incoming.state);
          }
        });
      } catch (e) {
        console.error("[stellar-life] room connection failed", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
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
