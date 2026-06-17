import { applyAction, createGame, type GameAction, type SeatInput } from "./game/engine";
import type { GameState } from "./game/types";

// Room state is the single source of truth persisted in the Supabase `rooms`
// row (state jsonb + version). It is intentionally self-contained — seats live
// here rather than in the players table — so the reducer is pure and the same
// optimistic-concurrency pattern from StellarBurst can be reused unchanged.

export interface Seat {
  id: string;
  name: string;
  isCpu: boolean;
  ready: boolean;
  /** Owning browser's stable client id; null for CPU seats. */
  clientId: string | null;
}

export type RoomPhase = "lobby" | "playing" | "finished";

export interface RoomState {
  phase: RoomPhase;
  hostClientId: string;
  seats: Seat[];
  seed: string;
  game: GameState | null;
}

export const MAX_SEATS = 8;
export const MIN_SEATS = 2;

export type RoomAction =
  | { type: "JOIN"; clientId: string; name: string; seatId: string }
  | { type: "LEAVE"; clientId: string }
  | { type: "TOGGLE_READY"; seatId: string }
  | { type: "RENAME"; seatId: string; name: string }
  | { type: "ADD_CPU"; seatId: string }
  | { type: "REMOVE_SEAT"; seatId: string; byClientId: string }
  | { type: "START"; byClientId: string }
  | { type: "RESTART"; byClientId: string }
  | { type: "GAME"; action: GameAction };

export function createRoomState(hostClientId: string, seed: string): RoomState {
  return { phase: "lobby", hostClientId, seats: [], seed, game: null };
}

const CPU_NAMES = [
  "コメット",
  "ルナ",
  "オリオン",
  "ノヴァ",
  "アステル",
  "ベガ",
  "ドリフト",
];

function isHost(state: RoomState, clientId: string): boolean {
  return state.hostClientId === clientId;
}

function readyToStart(state: RoomState): boolean {
  if (state.seats.length < MIN_SEATS) return false;
  return state.seats.every((s) => s.isCpu || s.ready);
}

/** Pure room reducer. Invalid actions return the input unchanged. */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "JOIN": {
      if (state.phase !== "lobby") return state;
      if (state.seats.some((s) => s.clientId === action.clientId)) return state;
      if (state.seats.length >= MAX_SEATS) return state;
      const seat: Seat = {
        id: action.seatId,
        name: action.name.trim() || "プレイヤー",
        isCpu: false,
        ready: false,
        clientId: action.clientId,
      };
      return { ...state, seats: [...state.seats, seat] };
    }

    case "LEAVE": {
      if (state.phase !== "lobby") return state;
      return {
        ...state,
        seats: state.seats.filter((s) => s.clientId !== action.clientId),
      };
    }

    case "TOGGLE_READY":
      return mapSeat(state, action.seatId, (s) => ({ ...s, ready: !s.ready }));

    case "RENAME":
      return mapSeat(state, action.seatId, (s) => ({
        ...s,
        name: action.name.trim() || s.name,
      }));

    case "ADD_CPU": {
      if (state.phase !== "lobby") return state;
      if (state.seats.length >= MAX_SEATS) return state;
      const n = state.seats.filter((s) => s.isCpu).length;
      const seat: Seat = {
        id: action.seatId,
        name: `CPU ${CPU_NAMES[n % CPU_NAMES.length]}`,
        isCpu: true,
        ready: true,
        clientId: null,
      };
      return { ...state, seats: [...state.seats, seat] };
    }

    case "REMOVE_SEAT": {
      if (state.phase !== "lobby") return state;
      const target = state.seats.find((s) => s.id === action.seatId);
      if (!target) return state;
      // Host can remove anyone; players can remove their own / CPU seats.
      const allowed =
        isHost(state, action.byClientId) ||
        target.clientId === action.byClientId ||
        target.isCpu;
      if (!allowed) return state;
      return {
        ...state,
        seats: state.seats.filter((s) => s.id !== action.seatId),
      };
    }

    case "START": {
      if (state.phase !== "lobby") return state;
      if (!isHost(state, action.byClientId)) return state;
      if (!readyToStart(state)) return state;
      const seats: SeatInput[] = state.seats.map((s) => ({
        id: s.id,
        name: s.name,
        isCpu: s.isCpu,
      }));
      const game = createGame(seats, state.seed);
      return { ...state, phase: "playing", game };
    }

    case "RESTART": {
      if (!isHost(state, action.byClientId)) return state;
      const seats = state.seats.map((s) => ({ ...s, ready: s.isCpu }));
      return {
        ...state,
        phase: "lobby",
        game: null,
        seed: `${state.seed}-r${Date.now().toString(36)}`,
        seats,
      };
    }

    case "GAME": {
      if (state.phase !== "playing" || !state.game) return state;
      const game = applyAction(state.game, action.action);
      if (game === state.game) return state;
      const phase: RoomPhase = game.phase === "finished" ? "finished" : "playing";
      return { ...state, game, phase };
    }

    default:
      return state;
  }
}

function mapSeat(
  state: RoomState,
  seatId: string,
  fn: (s: Seat) => Seat,
): RoomState {
  if (state.phase !== "lobby") return state;
  let changed = false;
  const seats = state.seats.map((s) => {
    if (s.id !== seatId) return s;
    changed = true;
    return fn(s);
  });
  return changed ? { ...state, seats } : state;
}

export function canStart(state: RoomState): boolean {
  return readyToStart(state);
}

export function seatForClient(state: RoomState, clientId: string): Seat | null {
  return state.seats.find((s) => s.clientId === clientId) ?? null;
}
