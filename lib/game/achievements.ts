// Life goals ("達成した人生目標"). Earning these is a major, non-money path to
// victory and also feeds the 宇宙貢献度 (space contribution) score.

export interface Achievement {
  id: string;
  label: string;
  /** Score points awarded for holding this goal. */
  points: number;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  scholar: { id: "scholar", label: "奨学生", points: 6 },
  first_contact: { id: "first_contact", label: "宇宙との出会い", points: 8 },
  joint_launch: { id: "joint_launch", label: "共同打ち上げ成功", points: 12 },
  moon_base: { id: "moon_base", label: "月面基地計画の一員", points: 16 },
  mars_lottery: { id: "mars_lottery", label: "火星移住者", points: 18 },
  interstellar: { id: "interstellar", label: "恒星間探査者", points: 30 },
};

export function achievementLabel(id: string): string {
  return ACHIEVEMENTS[id]?.label ?? id;
}

export function achievementPoints(id: string): number {
  return ACHIEVEMENTS[id]?.points ?? 0;
}
