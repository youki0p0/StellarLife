// Core domain types for Stellar Life.
// The whole game is a pure reducer over GameState; nothing here touches the
// network or React so it can be unit-tested in isolation.

export type StatKey =
  | "money"
  | "skill"
  | "health"
  | "reputation"
  | "fuel"
  | "crew"
  | "dream"
  | "risk";

export type Stats = Record<StatKey, number>;

/** Partial stat change applied by a tile or event. */
export type StatDelta = Partial<Stats>;

export type SegmentId =
  | "earth"
  | "low_orbit"
  | "moon"
  | "mars"
  | "deep_space";

export interface Segment {
  id: SegmentId;
  /** Japanese display name. */
  name: string;
  /** Neon accent colour key used by the UI. */
  accent: string;
  /** Fuel required to cross into this segment from the previous one. */
  fuelGate: number;
}

export type TileKind =
  | "start"
  | "event" // draw an event card
  | "stat" // fixed stat change
  | "mission" // co-op style positive milestone
  | "gate" // segment boundary, needs fuel to pass
  | "goal"; // final tile (deep space frontier)

export interface Tile {
  index: number;
  segment: SegmentId;
  kind: TileKind;
  /** Short Japanese label shown on the board. */
  label: string;
  /** For "stat" tiles: the change applied on landing. */
  delta?: StatDelta;
  /** For "stat"/"mission" tiles: a flavour line for the log. */
  note?: string;
  /** For "mission" tiles: a life goal id awarded on landing. */
  achievement?: string;
}

export interface EventChoice {
  id: string;
  label: string;
  delta: StatDelta;
  note: string;
  achievement?: string;
}

export type EventScope = "personal" | "global";

export interface GameEventCard {
  id: string;
  scope: EventScope;
  title: string;
  description: string;
  /** Applied immediately when there are no choices. */
  delta?: StatDelta;
  /** If present, the active player must choose one. */
  choices?: EventChoice[];
  achievement?: string;
}

export interface PlayerState {
  id: string;
  name: string;
  isCpu: boolean;
  color: string;
  position: number;
  stats: Stats;
  achievements: string[];
  finished: boolean;
}

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  /** Optional accent colour key for the log line. */
  tone?: "good" | "bad" | "info" | "global";
  /** The player this entry is about, if any (used to build per-player diaries). */
  playerId?: string;
}

/** The most recently resolved event, surfaced as a transient popup in the UI. */
export interface EventFlash {
  /** Monotonic id so the UI can detect a brand-new flash. */
  seq: number;
  scope: EventScope;
  playerId: string | null;
  playerName: string;
  title: string;
  description: string;
  delta: StatDelta;
  tone: LogEntry["tone"];
  achievement?: string;
}

/** A decision the active player must resolve before the turn can advance. */
export interface PendingChoice {
  playerId: string;
  card: GameEventCard;
}

export type GamePhase = "lobby" | "playing" | "finished";

export interface GameState {
  phase: GamePhase;
  /** Deterministic RNG state (mulberry32). */
  rng: number;
  turnOrder: string[];
  currentTurnIndex: number;
  /** Number of completed individual turns. */
  turnCount: number;
  /** Soft cap: once exceeded and everyone has had a fair share, the game ends. */
  maxTurns: number;
  players: Record<string, PlayerState>;
  log: LogEntry[];
  logSeq: number;
  pending: PendingChoice | null;
  /** Result of the last dice roll, kept for UI animation. */
  lastRoll: { playerId: string; value: number } | null;
  /** Most recent resolved event, shown as a transient popup. */
  lastEvent: EventFlash | null;
  /** Monotonic counter backing EventFlash.seq. */
  eventSeq: number;
  winnerId: string | null;
}

export interface ScoreBreakdown {
  playerId: string;
  reached: number; // distance / progress points
  money: number;
  skill: number;
  reputation: number;
  crew: number;
  dream: number;
  contribution: number; // 宇宙貢献度
  goals: number; // achieved life goals
  total: number;
}
