import { achievementPoints } from "./achievements";
import { BOARD, segmentRank, tileAt } from "./board";
import type { GameState, PlayerState, ScoreBreakdown } from "./types";

// The winner is not simply the richest player — it is the one who lived the
// most legendary stellar life. Money is just one of many weighted components,
// and reaching deep space, chasing dreams, and gathering crew all count.

const WEIGHTS = {
  reachedPerTile: 2,
  reachedPerSegment: 12,
  money: 0.4, // deliberately low so cash alone cannot win
  skill: 1.4,
  reputation: 1.6,
  crew: 6,
  dream: 2.2,
  goalPoints: 1, // achievement points pass through at 1x
};

/** 宇宙貢献度: how much this life pushed humanity outward. */
export function spaceContribution(player: PlayerState): number {
  const tile = tileAt(player.position);
  const reach = segmentRank(tile.segment); // 0..4
  const goalPts = player.achievements.reduce(
    (sum, id) => sum + achievementPoints(id),
    0,
  );
  const dreamBonus = Math.floor(player.stats.dream / 5);
  const skillBonus = Math.floor(player.stats.skill / 6);
  return reach * 10 + Math.floor(goalPts / 2) + dreamBonus + skillBonus;
}

export function scorePlayer(player: PlayerState): ScoreBreakdown {
  const tile = tileAt(player.position);
  const reached =
    player.position * WEIGHTS.reachedPerTile +
    segmentRank(tile.segment) * WEIGHTS.reachedPerSegment;

  const goals = player.achievements.reduce(
    (sum, id) => sum + achievementPoints(id) * WEIGHTS.goalPoints,
    0,
  );

  const money = player.stats.money * WEIGHTS.money;
  const skill = player.stats.skill * WEIGHTS.skill;
  const reputation = player.stats.reputation * WEIGHTS.reputation;
  const crew = player.stats.crew * WEIGHTS.crew;
  const dream = player.stats.dream * WEIGHTS.dream;
  const contribution = spaceContribution(player);

  // High lingering risk shaves a little off the legend — living recklessly
  // has a cost, but never enough to dominate the result.
  const riskPenalty = Math.floor(player.stats.risk / 10);

  const total = Math.round(
    reached +
      money +
      skill +
      reputation +
      crew +
      dream +
      contribution +
      goals -
      riskPenalty,
  );

  return {
    playerId: player.id,
    reached: Math.round(reached),
    money: Math.round(money),
    skill: Math.round(skill),
    reputation: Math.round(reputation),
    crew: Math.round(crew),
    dream: Math.round(dream),
    contribution,
    goals: Math.round(goals),
    total,
  };
}

export function rankings(state: GameState): ScoreBreakdown[] {
  return Object.values(state.players)
    .map(scorePlayer)
    .sort((a, b) => b.total - a.total);
}

export function winnerId(state: GameState): string | null {
  const ranked = rankings(state);
  return ranked.length > 0 ? ranked[0].playerId : null;
}

export const BOARD_LENGTH = BOARD.length;
