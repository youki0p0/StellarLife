import type { GameEventCard, SegmentId } from "./types";

// Events lean into life moments and space-development trouble rather than
// direct player-vs-player attacks. Personal cards hit the active player;
// global cards affect everyone for that "we're all in this together" feel.

// --- Earth-life flavoured personal events -------------------------------

const EARTH_EVENTS: GameEventCard[] = [
  {
    id: "scholarship_offer",
    scope: "personal",
    title: "進路の岐路",
    description: "進学か、就職か。あなたの選択は?",
    choices: [
      { id: "study", label: "進学する", delta: { skill: 6, money: -8, dream: 3 }, note: "学びを選んだ" },
      { id: "work", label: "就職する", delta: { money: 12, skill: 2 }, note: "社会に出た" },
    ],
  },
  {
    id: "black_company",
    scope: "personal",
    title: "ブラック企業に就職",
    description: "給料は出るが、心と体がすり減っていく…",
    delta: { money: 10, health: -10, dream: -4 },
  },
  {
    id: "research_viral",
    scope: "personal",
    title: "研究がバズる",
    description: "あなたの研究がネットで大反響。名声が一気に上がった。",
    delta: { reputation: 10, skill: 3, dream: 4 },
  },
  {
    id: "space_venture",
    scope: "personal",
    title: "宇宙ベンチャーに転職",
    description: "安定を捨てて、夢のある会社へ飛び込んだ。",
    delta: { dream: 8, skill: 4, money: -6, risk: 4 },
  },
  {
    id: "meet_investor",
    scope: "personal",
    title: "投資家に出会う",
    description: "熱意あるエンジェル投資家と意気投合。",
    choices: [
      { id: "take", label: "出資を受ける", delta: { money: 24, risk: 8 }, note: "大型出資を獲得" },
      { id: "decline", label: "自力でやる", delta: { dream: 4, reputation: 3 }, note: "独立を貫いた" },
    ],
  },
  {
    id: "burnout",
    scope: "personal",
    title: "働きすぎで体調を崩す",
    description: "少し休もう。健康あっての挑戦だ。",
    delta: { health: -8, money: -4 },
  },
];

// --- Space-development trouble + opportunity personal events ------------

const SPACE_EVENTS: GameEventCard[] = [
  {
    id: "launch_delay",
    scope: "personal",
    title: "ロケット打ち上げ延期",
    description: "天候不良で打ち上げが延期に。燃料を温存できた。",
    delta: { fuel: 4, reputation: -2 },
  },
  {
    id: "crew_joins",
    scope: "personal",
    title: "クルーが増える",
    description: "頼れる仲間が新たに加わった。",
    delta: { crew: 1, dream: 3, health: 2 },
  },
  {
    id: "joint_research",
    scope: "personal",
    title: "共同研究に成功する",
    description: "他チームとの共同研究が大きな成果を上げた。",
    delta: { skill: 6, reputation: 5, crew: 1 },
  },
  {
    id: "spacecraft_trouble",
    scope: "personal",
    title: "宇宙船トラブル発生",
    description: "システム異常。修理に資源を割くことに。",
    choices: [
      { id: "repair", label: "全力で修理", delta: { money: -10, skill: 4, risk: -4 }, note: "懸命の修理で乗り切った" },
      { id: "improvise", label: "応急処置で進む", delta: { fuel: -4, risk: 6 }, note: "応急処置で進んだ" },
    ],
  },
  {
    id: "fuel_spike",
    scope: "personal",
    title: "燃料価格高騰",
    description: "燃料市場が乱高下。備蓄が削られた。",
    delta: { fuel: -5, money: -4 },
  },
  {
    id: "tourism_boom",
    scope: "personal",
    title: "宇宙観光ブーム",
    description: "あなたの事業に観光客が殺到した。",
    delta: { money: 18, reputation: 4, risk: 3 },
  },
  {
    id: "patron",
    scope: "personal",
    title: "夢を語ったら支援者が現れた",
    description: "プレゼンに感動した支援者が名乗りを上げた。",
    delta: { money: 12, dream: 5, crew: 1 },
  },
  {
    id: "solar_storm_personal",
    scope: "personal",
    title: "太陽フレアに遭遇",
    description: "強い放射線。シールドを上げてやり過ごす。",
    delta: { health: -6, fuel: -3, skill: 2 },
  },
];

// --- Global events: shake up the whole table ----------------------------

export const GLOBAL_EVENTS: GameEventCard[] = [
  {
    id: "global_grant",
    scope: "global",
    title: "全体イベント: 宇宙開発予算が増額",
    description: "国際的な宇宙開発ブーム。全員が恩恵を受ける。",
    delta: { money: 8, dream: 3 },
  },
  {
    id: "global_fuel_crisis",
    scope: "global",
    title: "全体イベント: 世界的な燃料危機",
    description: "燃料価格が暴騰。全員の備蓄が目減りする。",
    delta: { fuel: -4 },
  },
  {
    id: "global_breakthrough",
    scope: "global",
    title: "全体イベント: 推進技術のブレイクスルー",
    description: "新型エンジンが公開され、全員の技術が底上げされた。",
    delta: { skill: 4, fuel: 3 },
  },
  {
    id: "global_meteor",
    scope: "global",
    title: "全体イベント: 流星群警報",
    description: "予期せぬ流星群。全員が回避に追われる。",
    delta: { health: -3, risk: 3 },
  },
  {
    id: "global_festival",
    scope: "global",
    title: "全体イベント: 宇宙開発フェス",
    description: "世界中が宇宙に沸いた。仲間と名声が広がる。",
    delta: { reputation: 4, crew: 1 },
  },
];

// Which personal deck a tile draws from, based on its segment.
const PERSONAL_DECKS: Record<SegmentId, GameEventCard[]> = {
  earth: EARTH_EVENTS,
  low_orbit: SPACE_EVENTS,
  moon: SPACE_EVENTS,
  mars: SPACE_EVENTS,
  deep_space: SPACE_EVENTS,
};

export function personalDeck(segment: SegmentId): GameEventCard[] {
  return PERSONAL_DECKS[segment];
}

export const ALL_PERSONAL_EVENTS: GameEventCard[] = [
  ...EARTH_EVENTS,
  ...SPACE_EVENTS,
];
