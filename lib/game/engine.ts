import { achievementLabel } from "./achievements";
import { BOARD, LAST_TILE, SEGMENTS, tileAt } from "./board";
import { GLOBAL_EVENTS, personalDeck } from "./events";
import { pick, rollInt, seedFromString } from "./rng";
import { winnerId } from "./score";
import { applyDelta, describeDelta, initialStats } from "./stats";
import type {
  EventFlash,
  GameEventCard,
  GameState,
  LogEntry,
  PlayerState,
  StatDelta,
  Tile,
} from "./types";

// Pure game engine. Every transition is deterministic given (state, action)
// because all randomness flows through the integer rng state stored on the
// GameState. The host persists the result; clients reapply or reload.

const REFUEL_ON_BLOCK = 6;
const RISK_ACCIDENT_DELTA: StatDelta = { fuel: -3, health: -3, money: -2 };
/** A global event fires this many full rounds apart. */
const GLOBAL_EVENT_EVERY_ROUNDS = 2;

const PLAYER_COLORS = [
  "cyan",
  "magenta",
  "lime",
  "gold",
  "violet",
  "red",
  "cyan",
  "magenta",
];

export interface SeatInput {
  id: string;
  name: string;
  isCpu: boolean;
}

export function createGame(seats: SeatInput[], seed: string): GameState {
  const players: Record<string, PlayerState> = {};
  seats.forEach((seat, i) => {
    players[seat.id] = {
      id: seat.id,
      name: seat.name,
      isCpu: seat.isCpu,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      position: 0,
      route: null,
      stats: initialStats(),
      achievements: [],
      finished: false,
    };
  });

  return {
    phase: "playing",
    rng: seedFromString(seed),
    turnOrder: seats.map((s) => s.id),
    currentTurnIndex: 0,
    turnCount: 0,
    maxTurns: Math.max(40, seats.length * 18),
    players,
    log: [
      {
        id: 0,
        turn: 0,
        text: "Stellar Life 開始。地球での人生が始まった。",
        tone: "info",
      },
    ],
    logSeq: 1,
    pending: null,
    lastRoll: null,
    lastEvent: null,
    eventSeq: 0,
    coop: {
      title: "共同打ち上げ計画",
      description: "みんなで燃料ゲートを突破し、人類を宇宙へ押し上げよう。",
      progress: 0,
      goal: Math.max(4, seats.length * 3),
      reward: { dream: 6, reputation: 4, fuel: 4, crew: 1 },
      done: false,
    },
    winnerId: null,
  };
}

export type GameAction =
  | { type: "ROLL"; playerId: string }
  | { type: "CHOOSE"; playerId: string; choiceId: string };

/** Apply an action, returning a new state (never mutates the input). */
export function applyAction(state: GameState, action: GameAction): GameState {
  if (state.phase !== "playing") return state;
  const current = state.turnOrder[state.currentTurnIndex];

  switch (action.type) {
    case "ROLL":
      if (state.pending) return state; // must resolve a choice first
      if (action.playerId !== current) return state;
      return handleRoll(state);
    case "CHOOSE":
      if (!state.pending || state.pending.playerId !== action.playerId) {
        return state;
      }
      return handleChoose(state, action.choiceId);
    default:
      return state;
  }
}

// --- internals ----------------------------------------------------------

interface Draft {
  state: GameState;
  players: Record<string, PlayerState>;
  log: LogEntry[];
  rng: number;
  logSeq: number;
  lastEvent: GameState["lastEvent"];
  eventSeq: number;
  coop: GameState["coop"];
}

function startDraft(state: GameState): Draft {
  return {
    state,
    players: cloneePlayers(state.players),
    log: [...state.log],
    rng: state.rng,
    logSeq: state.logSeq,
    lastEvent: state.lastEvent,
    eventSeq: state.eventSeq,
    coop: state.coop ? { ...state.coop } : null,
  };
}

/** Add shared progress to the co-op mission; completing it rewards everyone. */
function contributeCoop(draft: Draft, amount: number, byName: string) {
  const coop = draft.coop;
  if (!coop || coop.done) return;
  const progress = Math.min(coop.goal, coop.progress + amount);
  draft.coop = { ...coop, progress };
  addLog(
    draft,
    draft.state.turnCount,
    `${byName} が共同ミッションに貢献 (${progress}/${coop.goal})。`,
    "info",
  );
  if (progress >= coop.goal) {
    draft.coop = { ...draft.coop, done: true };
    for (const id of Object.keys(draft.players)) {
      const p = draft.players[id];
      if (p.finished) continue;
      p.stats = applyDelta(p.stats, coop.reward);
    }
    addLog(
      draft,
      draft.state.turnCount,
      `共同ミッション「${coop.title}」を全員で達成! (${describeDelta(coop.reward)})`,
      "global",
    );
    flashEvent(draft, {
      scope: "global",
      playerId: null,
      playerName: "全体",
      title: `共同ミッション達成: ${coop.title}`,
      description: "全員の力で打ち上げ計画を成功させた。",
      delta: coop.reward,
      tone: "good",
    });
  }
}

function cloneePlayers(
  players: Record<string, PlayerState>,
): Record<string, PlayerState> {
  const out: Record<string, PlayerState> = {};
  for (const id of Object.keys(players)) {
    const p = players[id];
    out[id] = { ...p, stats: { ...p.stats }, achievements: [...p.achievements] };
  }
  return out;
}

function addLog(
  draft: Draft,
  turn: number,
  text: string,
  tone?: LogEntry["tone"],
  playerId?: string,
) {
  draft.log.push({ id: draft.logSeq, turn, text, tone, playerId });
  draft.logSeq += 1;
  // Keep the feed bounded so the persisted state stays small.
  if (draft.log.length > 80) draft.log = draft.log.slice(-80);
}

/** Record a transient event popup for the UI to surface. */
function flashEvent(draft: Draft, flash: Omit<EventFlash, "seq">) {
  draft.eventSeq += 1;
  draft.lastEvent = { ...flash, seq: draft.eventSeq };
}

function award(draft: Draft, player: PlayerState, achievementId?: string) {
  if (!achievementId) return;
  if (player.achievements.includes(achievementId)) return;
  player.achievements.push(achievementId);
  addLog(
    draft,
    draft.state.turnCount,
    `${player.name} が人生目標を達成: ${achievementLabel(achievementId)}`,
    "good",
    player.id,
  );
}

function handleRoll(state: GameState): GameState {
  const draft = startDraft(state);
  const playerId = state.turnOrder[state.currentTurnIndex];
  const player = draft.players[playerId];

  const [rngAfterRoll, roll] = rollInt(draft.rng, 1, 6);
  draft.rng = rngAfterRoll;
  addLog(
    draft,
    state.turnCount,
    `${player.name} が ${roll} を出した。`,
    "info",
    player.id,
  );

  // Move forward, honouring fuel gates between segments.
  const moved = move(player, roll, draft);
  player.position = moved.position;

  if (moved.blockedGate) {
    player.stats = applyDelta(player.stats, { fuel: REFUEL_ON_BLOCK });
    addLog(
      draft,
      state.turnCount,
      `${player.name} は燃料不足で「${moved.blockedGate.label}」の手前で待機。補給した (燃料+${REFUEL_ON_BLOCK})。`,
      "bad",
      player.id,
    );
  }

  const tile = tileAt(player.position);
  const needsChoice = resolveLanding(draft, player, tile);

  const lastRoll = { playerId, value: roll };
  if (needsChoice) {
    // Hold the turn open until the player resolves the event.
    return commit(state, draft, {
      lastRoll,
      pending: needsChoice,
    });
  }

  return advanceTurn(commitState(state, draft, { lastRoll, pending: null }));
}

function handleChoose(state: GameState, choiceId: string): GameState {
  const draft = startDraft(state);
  const pending = state.pending!;
  const player = draft.players[pending.playerId];
  const choice = pending.card.choices?.find((c) => c.id === choiceId);

  if (choice) {
    if (choice.route) player.route = choice.route;
    player.stats = applyDelta(player.stats, choice.delta);
    award(draft, player, choice.achievement);
    addLog(
      draft,
      state.turnCount,
      `${player.name}: ${choice.note} (${describeDelta(choice.delta) || "効果なし"})`,
      deltaTone(choice.delta),
      player.id,
    );
    flashEvent(draft, {
      scope: "personal",
      playerId: player.id,
      playerName: player.name,
      title: pending.card.title,
      description: choice.note,
      delta: choice.delta,
      tone: deltaTone(choice.delta),
      achievement: choice.achievement,
    });
  }

  return advanceTurn(commitState(state, draft, { pending: null }));
}

interface MoveResult {
  position: number;
  blockedGate: Tile | null;
}

function move(player: PlayerState, roll: number, draft: Draft): MoveResult {
  let pos = player.position;
  let remaining = roll;
  while (remaining > 0 && pos < LAST_TILE) {
    const next = pos + 1;
    const tile = BOARD[next];
    // Must choose a route before entering the branch: stop on the branch tile.
    if (tile.kind === "branch" && player.route === null) {
      return { position: next, blockedGate: null };
    }
    if (tile.kind === "gate") {
      const cost = SEGMENTS[tile.segment].fuelGate;
      if (player.stats.fuel < cost) {
        return { position: pos, blockedGate: tile };
      }
      player.stats = applyDelta(player.stats, { fuel: -cost });
      addLog(
        draft,
        draft.state.turnCount,
        `${player.name} は「${tile.label}」を突破! (燃料-${cost})`,
        "good",
        player.id,
      );
      // Crossing a gate is a shared step toward the co-op launch programme.
      contributeCoop(draft, 1, player.name);
    }
    pos = next;
    remaining -= 1;
  }
  return { position: pos, blockedGate: null };
}

/** Resolve a tile's content for a player, applying their chosen route variant. */
function effectiveTile(tile: Tile, player: PlayerState) {
  if (tile.variants && player.route) {
    const v = tile.variants[player.route];
    return {
      label: v.label,
      delta: v.delta,
      note: v.note,
      achievement: v.achievement,
    };
  }
  return {
    label: tile.label,
    delta: tile.delta,
    note: tile.note,
    achievement: tile.achievement,
  };
}

/** Resolve the landed tile. Returns a PendingChoice if it needs a decision. */
function resolveLanding(
  draft: Draft,
  player: PlayerState,
  tile: Tile,
): GameState["pending"] {
  switch (tile.kind) {
    case "start":
    case "gate":
      return null;
    case "branch":
      return resolveBranch(draft, player);
    case "stat":
    case "mission":
    case "goal": {
      const eff = effectiveTile(tile, player);
      if (eff.delta) player.stats = applyDelta(player.stats, eff.delta);
      award(draft, player, eff.achievement);
      addLog(
        draft,
        draft.state.turnCount,
        `${player.name}: ${eff.note ?? eff.label}` +
          (eff.delta ? ` (${describeDelta(eff.delta)})` : ""),
        tile.kind === "goal" ? "good" : deltaTone(eff.delta ?? {}),
        player.id,
      );
      if (tile.kind === "mission" || tile.kind === "goal") {
        flashEvent(draft, {
          scope: "personal",
          playerId: player.id,
          playerName: player.name,
          title: eff.label,
          description: eff.note ?? eff.label,
          delta: eff.delta ?? {},
          tone: "good",
          achievement: eff.achievement,
        });
      }
      if (tile.kind === "mission") contributeCoop(draft, 2, player.name);
      if (tile.kind === "goal") {
        player.finished = true;
        addLog(
          draft,
          draft.state.turnCount,
          `${player.name} がフロンティアに到達! 伝説の航海を成し遂げた。`,
          "global",
          player.id,
        );
      }
      return null;
    }
    case "event":
      return drawEvent(draft, player, tile);
    default:
      return null;
  }
}

/** The Moon-vs-Mars route choice presented at the branch tile. */
function resolveBranch(
  draft: Draft,
  player: PlayerState,
): GameState["pending"] {
  if (player.route !== null) return null; // already chosen
  const card: GameEventCard = {
    id: "route_choice",
    scope: "personal",
    title: "ルート分岐",
    description: "次に目指すのは月か、火星か。選んだ道で人生が変わる。",
    choices: [
      {
        id: "moon",
        label: "月ルート",
        delta: { skill: 3, fuel: 2 },
        note: "月を目指すことにした",
        route: "moon",
      },
      {
        id: "mars",
        label: "火星ルート",
        delta: { dream: 4, reputation: 2 },
        note: "火星を目指すことにした",
        route: "mars",
      },
    ],
  };
  addLog(
    draft,
    draft.state.turnCount,
    `${player.name} はルート分岐に到達。月か火星かを選ぶ。`,
    "info",
    player.id,
  );
  return { playerId: player.id, card };
}

function drawEvent(
  draft: Draft,
  player: PlayerState,
  tile: Tile,
): GameState["pending"] {
  const deck = personalDeck(tile.segment);
  const [rngAfter, card] = pick<GameEventCard>(draft.rng, deck);
  draft.rng = rngAfter;

  // Risk can trigger a minor accident in space segments before the card.
  if (tile.segment !== "earth") {
    const [rngRisk, roll] = rollInt(draft.rng, 1, 100);
    draft.rng = rngRisk;
    if (roll <= player.stats.risk) {
      player.stats = applyDelta(player.stats, RISK_ACCIDENT_DELTA);
      addLog(
        draft,
        draft.state.turnCount,
        `${player.name} はリスクが高く小事故に見舞われた (${describeDelta(RISK_ACCIDENT_DELTA)})。`,
        "bad",
        player.id,
      );
      flashEvent(draft, {
        scope: "personal",
        playerId: player.id,
        playerName: player.name,
        title: "小事故発生",
        description: "リスクが高く、宇宙開発のトラブルに見舞われた。",
        delta: RISK_ACCIDENT_DELTA,
        tone: "bad",
      });
    }
  }

  if (card.choices && card.choices.length > 0) {
    addLog(
      draft,
      draft.state.turnCount,
      `${player.name} にイベント発生: ${card.title}`,
      "info",
      player.id,
    );
    return { playerId: player.id, card };
  }

  if (card.delta) player.stats = applyDelta(player.stats, card.delta);
  award(draft, player, card.achievement);
  addLog(
    draft,
    draft.state.turnCount,
    `${player.name}: ${card.title} — ${describeDelta(card.delta ?? {}) || "効果なし"}`,
    deltaTone(card.delta ?? {}),
    player.id,
  );
  flashEvent(draft, {
    scope: "personal",
    playerId: player.id,
    playerName: player.name,
    title: card.title,
    description: card.description,
    delta: card.delta ?? {},
    tone: deltaTone(card.delta ?? {}),
    achievement: card.achievement,
  });
  return null;
}

function advanceTurn(state: GameState): GameState {
  if (isGameOver(state)) {
    return finishGame(state);
  }

  const draft = startDraft(state);
  const numPlayers = state.turnOrder.length;
  let turnCount = state.turnCount + 1;
  let idx = state.currentTurnIndex;

  // Skip players who have already reached the frontier.
  for (let i = 0; i < numPlayers; i++) {
    idx = (idx + 1) % numPlayers;
    const candidate = draft.players[state.turnOrder[idx]];
    if (!candidate.finished) break;
  }

  let next: GameState = commitState(state, draft, {
    currentTurnIndex: idx,
    turnCount,
  });

  // Fire a global event at the top of every Nth full round.
  const roundJustStarted = idx === 0 && turnCount % numPlayers === 0;
  const rounds = Math.floor(turnCount / numPlayers);
  if (roundJustStarted && rounds > 0 && rounds % GLOBAL_EVENT_EVERY_ROUNDS === 0) {
    next = applyGlobalEvent(next);
  }

  if (isGameOver(next)) return finishGame(next);
  return next;
}

function applyGlobalEvent(state: GameState): GameState {
  const draft = startDraft(state);
  const [rngAfter, card] = pick<GameEventCard>(draft.rng, GLOBAL_EVENTS);
  draft.rng = rngAfter;
  addLog(draft, state.turnCount, `${card.title} — ${card.description}`, "global");
  for (const id of state.turnOrder) {
    const p = draft.players[id];
    if (p.finished) continue;
    if (card.delta) p.stats = applyDelta(p.stats, card.delta);
  }
  flashEvent(draft, {
    scope: "global",
    playerId: null,
    playerName: "全体",
    title: card.title,
    description: card.description,
    delta: card.delta ?? {},
    tone: "global",
  });
  return commitState(state, draft, {});
}

function isGameOver(state: GameState): boolean {
  const everyoneDone = Object.values(state.players).every((p) => p.finished);
  return everyoneDone || state.turnCount >= state.maxTurns;
}

function finishGame(state: GameState): GameState {
  const draft = startDraft(state);
  addLog(draft, state.turnCount, "ゲーム終了。最終スコアを集計中…", "global");
  const finished = commitState(state, draft, { phase: "finished" });
  return { ...finished, winnerId: winnerId(finished) };
}

// --- commit helpers -----------------------------------------------------

function deltaTone(delta: StatDelta): LogEntry["tone"] {
  let sum = 0;
  for (const v of Object.values(delta)) sum += v ?? 0;
  if (sum > 0) return "good";
  if (sum < 0) return "bad";
  return "info";
}

function commit(
  prev: GameState,
  draft: Draft,
  patch: Partial<GameState>,
): GameState {
  return {
    ...prev,
    players: draft.players,
    log: draft.log,
    logSeq: draft.logSeq,
    rng: draft.rng,
    lastEvent: draft.lastEvent,
    eventSeq: draft.eventSeq,
    coop: draft.coop,
    ...patch,
  };
}

// Alias kept for readability at call sites that also pass a patch.
const commitState = commit;
