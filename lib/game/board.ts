import type { Segment, SegmentId, Tile } from "./types";

// The board is a single track that gradually expands from Earth out into deep
// space. Segment boundaries are "gate" tiles that need fuel to cross, which is
// what makes the journey feel like it leaves the ground and heads to the stars.

export const SEGMENTS: Record<SegmentId, Segment> = {
  earth: { id: "earth", name: "地球の人生", accent: "lime", fuelGate: 0 },
  low_orbit: { id: "low_orbit", name: "低軌道", accent: "cyan", fuelGate: 8 },
  mid: { id: "mid", name: "月/火星ルート", accent: "violet", fuelGate: 12 },
  deep_space: { id: "deep_space", name: "深宇宙", accent: "magenta", fuelGate: 20 },
};

export const SEGMENT_ORDER: SegmentId[] = [
  "earth",
  "low_orbit",
  "mid",
  "deep_space",
];

// Tile blueprints per segment (before they are flattened + indexed).
// Keeping deltas modest keeps single events from deciding the whole game.
type Blueprint = Omit<Tile, "index" | "segment">;

const EARTH: Blueprint[] = [
  { kind: "start", label: "スタート / 誕生" },
  { kind: "stat", label: "小学校", delta: { skill: 2, dream: 2 }, note: "学校で基礎を学んだ" },
  { kind: "event", label: "進路イベント" },
  { kind: "stat", label: "アルバイト", delta: { money: 8, health: -3 }, note: "バイト代を貯めた" },
  { kind: "event", label: "学生生活" },
  { kind: "mission", label: "奨学金を獲得", delta: { money: 14, reputation: 3 }, note: "奨学金を勝ち取った", achievement: "scholar" },
  { kind: "stat", label: "就職活動", delta: { reputation: 3, health: -4 }, note: "就活を乗り越えた" },
  { kind: "event", label: "社会人イベント" },
  { kind: "stat", label: "研究室", delta: { skill: 6, money: -4 }, note: "研究に打ち込んだ" },
  { kind: "event", label: "起業の誘い" },
  { kind: "mission", label: "宇宙開発との出会い", delta: { dream: 8, skill: 3 }, note: "宇宙開発に心を奪われた", achievement: "first_contact" },
  { kind: "event", label: "投資イベント" },
];

const LOW_ORBIT: Blueprint[] = [
  { kind: "gate", label: "打ち上げゲート" },
  { kind: "stat", label: "宇宙ステーション", delta: { skill: 5, reputation: 4 }, note: "軌道上の研究に参加" },
  { kind: "event", label: "軌道トラブル" },
  { kind: "stat", label: "衛星ビジネス", delta: { money: 16, risk: 4 }, note: "衛星事業で稼いだ" },
  { kind: "event", label: "宇宙観光" },
  { kind: "mission", label: "共同打ち上げ成功", delta: { reputation: 6, crew: 1, dream: 4 }, note: "仲間と打ち上げを成功させた", achievement: "joint_launch" },
  { kind: "event", label: "軌道イベント" },
];

// The branched middle: everyone enters here, picks Moon or Mars at the branch
// tile, then the route tiles resolve to their chosen route's variant.
const MID: Blueprint[] = [
  { kind: "gate", label: "遷移軌道" },
  { kind: "branch", label: "分岐: 月か火星か" },
  {
    kind: "stat",
    label: "拠点を築く",
    variants: {
      moon: { label: "月面基地", delta: { skill: 5, reputation: 5 }, note: "月面基地の建設に貢献" },
      mars: { label: "火星移住", delta: { dream: 8, health: -4 }, note: "赤い惑星に降り立った" },
    },
  },
  { kind: "event", label: "現地イベント" },
  {
    kind: "stat",
    label: "事業を広げる",
    variants: {
      moon: { label: "資源採掘", delta: { money: 14, risk: 3 }, note: "月の資源で稼いだ" },
      mars: { label: "コロニー運営", delta: { reputation: 6, crew: 1 }, note: "コロニーを切り盛りした" },
    },
  },
  { kind: "event", label: "開発イベント" },
  {
    kind: "stat",
    label: "研究を深める",
    variants: {
      moon: { label: "低重力研究", delta: { skill: 7, health: 4 }, note: "低重力研究で成果" },
      mars: { label: "テラフォーミング", delta: { skill: 8, reputation: 6 }, note: "火星を作り変える挑戦" },
    },
  },
  {
    kind: "mission",
    label: "歴史的偉業",
    variants: {
      moon: { label: "月面基地計画に参加", delta: { dream: 8, crew: 1, reputation: 4 }, note: "歴史的な月計画の一員に", achievement: "moon_base" },
      mars: { label: "火星移住抽選に当選", delta: { dream: 10, reputation: 5 }, note: "移住の切符を引き当てた", achievement: "mars_lottery" },
    },
  },
  { kind: "event", label: "補給イベント" },
];

const DEEP_SPACE: Blueprint[] = [
  { kind: "gate", label: "深宇宙への跳躍" },
  { kind: "stat", label: "木星圏", delta: { skill: 9, dream: 6 }, note: "巨大ガス惑星に到達" },
  { kind: "event", label: "深宇宙イベント" },
  { kind: "stat", label: "土星圏", delta: { reputation: 8, dream: 6 }, note: "輪を持つ惑星を間近に" },
  { kind: "event", label: "恒星間トラブル" },
  { kind: "goal", label: "恒星間探査 / フロンティア", delta: { dream: 16, reputation: 10 }, note: "人類の限界の先へ", achievement: "interstellar" },
];

const SEGMENT_BLUEPRINTS: Record<SegmentId, Blueprint[]> = {
  earth: EARTH,
  low_orbit: LOW_ORBIT,
  mid: MID,
  deep_space: DEEP_SPACE,
};

function buildBoard(): Tile[] {
  const tiles: Tile[] = [];
  let index = 0;
  for (const segment of SEGMENT_ORDER) {
    for (const bp of SEGMENT_BLUEPRINTS[segment]) {
      tiles.push({ ...bp, index, segment });
      index++;
    }
  }
  return tiles;
}

export const BOARD: Tile[] = buildBoard();
export const LAST_TILE = BOARD.length - 1;

export function tileAt(index: number): Tile {
  return BOARD[Math.max(0, Math.min(LAST_TILE, index))];
}

/** How far along the journey a tile sits, as ordered segment progress points. */
export function segmentRank(segment: SegmentId): number {
  return SEGMENT_ORDER.indexOf(segment);
}
