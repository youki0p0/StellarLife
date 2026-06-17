import type { StatDelta, StatKey, Stats } from "./types";

export const STAT_KEYS: StatKey[] = [
  "money",
  "skill",
  "health",
  "reputation",
  "fuel",
  "crew",
  "dream",
  "risk",
];

/** Japanese labels and neon accent for each stat. */
export const STAT_META: Record<
  StatKey,
  { label: string; accent: string; short: string }
> = {
  money: { label: "資金", accent: "gold", short: "$" },
  skill: { label: "技術", accent: "cyan", short: "SK" },
  health: { label: "健康", accent: "lime", short: "HP" },
  reputation: { label: "名声", accent: "magenta", short: "RP" },
  fuel: { label: "燃料", accent: "red", short: "FU" },
  crew: { label: "仲間", accent: "violet", short: "CR" },
  dream: { label: "夢", accent: "gold", short: "DR" },
  risk: { label: "リスク", accent: "red", short: "RK" },
};

/** Stats that are clamped to 0..100 (the rest only have a floor of 0). */
const BOUNDED: Partial<Record<StatKey, number>> = {
  health: 100,
  risk: 100,
};

export function initialStats(): Stats {
  return {
    money: 30,
    skill: 5,
    health: 80,
    reputation: 5,
    fuel: 10,
    crew: 1,
    dream: 10,
    risk: 10,
  };
}

export function clampStat(key: StatKey, value: number): number {
  const max = BOUNDED[key];
  const floored = Math.max(0, Math.round(value));
  return max === undefined ? floored : Math.min(max, floored);
}

export function applyDelta(stats: Stats, delta: StatDelta): Stats {
  const next: Stats = { ...stats };
  for (const key of STAT_KEYS) {
    const change = delta[key];
    if (change === undefined) continue;
    next[key] = clampStat(key, next[key] + change);
  }
  return next;
}

/** Format a delta as a compact human-readable string for the log. */
export function describeDelta(delta: StatDelta): string {
  const parts: string[] = [];
  for (const key of STAT_KEYS) {
    const change = delta[key];
    if (!change) continue;
    const sign = change > 0 ? "+" : "";
    parts.push(`${STAT_META[key].label}${sign}${change}`);
  }
  return parts.join(" / ");
}
