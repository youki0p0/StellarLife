import { describe, expect, it } from "vitest";
import { BOARD, LAST_TILE, SEGMENTS } from "./board";
import { activePlayerId, cpuChooseId, isCpuTurn } from "./cpu";
import { applyAction, createGame, type SeatInput } from "./engine";
import { rankings, scorePlayer } from "./score";
import { initialStats } from "./stats";
import type { GameState } from "./types";

const SEATS: SeatInput[] = [
  { id: "p1", name: "アリス", isCpu: false },
  { id: "p2", name: "ボブ", isCpu: true },
];

function newGame(seed = "test-seed"): GameState {
  return createGame(SEATS, seed);
}

/** Drive a CPU-style game to completion to exercise the full loop. */
function playToEnd(start: GameState): GameState {
  let state = start;
  let guard = 0;
  while (state.phase === "playing" && guard < 5000) {
    guard += 1;
    if (state.pending) {
      const choice = cpuChooseId(state) ?? state.pending.card.choices![0].id;
      state = applyAction(state, {
        type: "CHOOSE",
        playerId: state.pending.playerId,
        choiceId: choice,
      });
    } else {
      const current = state.turnOrder[state.currentTurnIndex];
      state = applyAction(state, { type: "ROLL", playerId: current });
    }
  }
  return state;
}

describe("board", () => {
  it("starts on a start tile and ends on a goal tile", () => {
    expect(BOARD[0].kind).toBe("start");
    expect(BOARD[LAST_TILE].kind).toBe("goal");
  });

  it("has a fuel gate at the front of every space segment", () => {
    for (const tile of BOARD) {
      if (tile.kind === "gate") {
        expect(SEGMENTS[tile.segment].fuelGate).toBeGreaterThan(0);
      }
    }
  });
});

describe("createGame", () => {
  it("seats every player at the start with initial stats", () => {
    const g = newGame();
    expect(Object.keys(g.players)).toHaveLength(2);
    expect(g.players.p1.position).toBe(0);
    expect(g.players.p1.stats).toEqual(initialStats());
    expect(g.phase).toBe("playing");
  });

  it("is deterministic for a given seed", () => {
    const a = playToEnd(newGame("seed-abc"));
    const b = playToEnd(newGame("seed-abc"));
    expect(rankings(a)).toEqual(rankings(b));
  });
});

describe("turn rules", () => {
  it("ignores a roll from a player whose turn it is not", () => {
    const g = newGame();
    const other = g.turnOrder[1];
    const after = applyAction(g, { type: "ROLL", playerId: other });
    expect(after).toBe(g);
  });

  it("moves the active player forward on a roll", () => {
    const g = newGame();
    const current = g.turnOrder[g.currentTurnIndex];
    const after = applyAction(g, { type: "ROLL", playerId: current });
    // Either the same player has a pending choice, or the turn advanced.
    const moved = after.players[current].position;
    expect(moved).toBeGreaterThan(0);
  });

  it("blocks progress at a fuel gate without enough fuel", () => {
    const g = newGame();
    const current = g.turnOrder[0];
    g.players[current].position = SEGMENTS.low_orbit.fuelGate; // near the gate
    g.players[current].stats.fuel = 0;
    // Find the first gate index.
    const gateIndex = BOARD.findIndex((t) => t.kind === "gate");
    g.players[current].position = gateIndex - 1;
    const after = applyAction(g, { type: "ROLL", playerId: current });
    // Cannot have crossed the gate with zero fuel.
    expect(after.players[current].position).toBeLessThanOrEqual(gateIndex - 1 + 0);
  });
});

describe("scoring", () => {
  it("does not let money alone decide the winner", () => {
    const g = newGame();
    const rich = scorePlayer({
      ...g.players.p1,
      stats: { ...initialStats(), money: 500 },
    });
    const dreamer = scorePlayer({
      ...g.players.p2,
      position: LAST_TILE,
      stats: { ...initialStats(), dream: 60, reputation: 40, crew: 5 },
      achievements: ["interstellar", "mars_lottery"],
    });
    expect(dreamer.total).toBeGreaterThan(rich.total);
  });
});

describe("full game", () => {
  it("reaches a finished state with a winner", () => {
    const end = playToEnd(newGame());
    expect(end.phase).toBe("finished");
    expect(end.winnerId).not.toBeNull();
  });
});

describe("event flash & diary tagging", () => {
  it("tags player-specific log entries and raises event flashes", () => {
    const end = playToEnd(newGame("flash-seed"));
    // Diaries are built from player-tagged log entries.
    const tagged = end.log.filter((l) => l.playerId);
    expect(tagged.length).toBeGreaterThan(0);
    // At least one resolved event was surfaced as a flash during the game.
    expect(end.eventSeq).toBeGreaterThan(0);
  });
});

describe("route branching", () => {
  it("forces a Moon/Mars choice and assigns a route during play", () => {
    const end = playToEnd(newGame("route-seed"));
    const routed = Object.values(end.players).filter((p) => p.route !== null);
    expect(routed.length).toBeGreaterThan(0);
    for (const p of routed) {
      expect(["moon", "mars"]).toContain(p.route);
    }
  });
});

describe("cpu helpers", () => {
  it("identifies the active player and cpu turns", () => {
    const g = newGame();
    expect(activePlayerId(g)).toBe(g.turnOrder[0]);
    expect(isCpuTurn(g)).toBe(false); // p1 is human
  });
});
