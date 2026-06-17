import { STAT_KEYS } from "./stats";
import type { GameState, StatDelta } from "./types";

// Lightweight CPU brain. The host drives CPU turns by dispatching ROLL, then
// CHOOSE when an event needs a decision. CPUs value a balanced, dream-forward
// life rather than pure cash, matching the game's win condition.

const CHOICE_WEIGHTS: Record<string, number> = {
  dream: 2.2,
  skill: 1.6,
  reputation: 1.6,
  crew: 4,
  money: 0.4,
  fuel: 1.2,
  health: 1.4,
  risk: -1.8,
};

function scoreDelta(delta: StatDelta): number {
  let score = 0;
  for (const key of STAT_KEYS) {
    const v = delta[key];
    if (v) score += v * (CHOICE_WEIGHTS[key] ?? 0);
  }
  return score;
}

/** Returns the best choice id for the current pending event, or null. */
export function cpuChooseId(state: GameState): string | null {
  const pending = state.pending;
  if (!pending?.card.choices?.length) return null;
  let bestId = pending.card.choices[0].id;
  let bestScore = -Infinity;
  for (const choice of pending.card.choices) {
    const s = scoreDelta(choice.delta);
    if (s > bestScore) {
      bestScore = s;
      bestId = choice.id;
    }
  }
  return bestId;
}

/** True when it is a CPU player's turn and the host should auto-play it. */
export function isCpuTurn(state: GameState): boolean {
  if (state.phase !== "playing") return false;
  if (state.pending) {
    return state.players[state.pending.playerId]?.isCpu ?? false;
  }
  const current = state.turnOrder[state.currentTurnIndex];
  return state.players[current]?.isCpu ?? false;
}

/** The id of the player who must act next (pending chooser or current). */
export function activePlayerId(state: GameState): string | null {
  if (state.phase !== "playing") return null;
  if (state.pending) return state.pending.playerId;
  return state.turnOrder[state.currentTurnIndex] ?? null;
}
