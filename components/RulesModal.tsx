"use client";

import { Button } from "./Button";
import { SEGMENT_ORDER, SEGMENTS } from "@/lib/game/board";
import { STAT_KEYS, STAT_META } from "@/lib/game/stats";
import { ACCENT_TEXT, accent } from "./ui";

// One-line meaning per stat, keyed alongside STAT_META labels.
const STAT_NOTES: Record<string, string> = {
  money: "活動の元手。ただし資金だけでは勝てない",
  skill: "宇宙開発を切り拓く実力。スコアに大きく効く",
  health: "無理がたたると進路に響く体力（0〜100）",
  reputation: "世間からの評価。伝説的な人生の証",
  fuel: "セグメント間の燃料ゲートを越えるために消費",
  crew: "共に旅する仲間。多いほど高スコア",
  dream: "宇宙への情熱。貢献度とスコアを押し上げる",
  risk: "高すぎると最終スコアがわずかに削られる（0〜100）",
};

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <h3 className="text-[11px] font-bold tracking-wider text-neon-cyan">
        <span className="text-neon-gold">{step}</span> {title}
      </h3>
      <div className="mt-1 text-[11px] leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

export function RulesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-30 flex items-center justify-center bg-void/80 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scanlines relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-neon-cyan bg-panel p-5 shadow-neon"
      >
        <div className="text-[10px] text-neon-cyan">遊び方</div>
        <h2 className="mt-1 text-base font-bold text-neon-magenta">
          Stellar Life — 宇宙へ行く人生すごろく
        </h2>

        <Section step="1" title="ゲームの目的">
          地球で人生を始め、軌道→月→火星→深宇宙へと旅立ちます。勝者は資金が一番の人ではなく、「最も伝説的な人生」を歩んだ人（最終スコア）です。
        </Section>

        <Section step="2" title="8つのステータス">
          <ul className="space-y-1">
            {STAT_KEYS.map((key) => {
              const meta = STAT_META[key];
              return (
                <li key={key}>
                  <span
                    className={`font-bold ${ACCENT_TEXT[accent(meta.accent)]}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-slate-400">：{STAT_NOTES[key]}</span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section step="3" title="ルート">
          <p>
            {SEGMENT_ORDER.map((id) => SEGMENTS[id].name).join("→")}
          </p>
          <p className="mt-1 text-slate-400">
            各セグメント入口の「燃料ゲート」を越えるには燃料が必要で、通過時に燃料を消費します。燃料が足りなければその場で待機して補給するだけ。脱落はありません。
          </p>
        </Section>

        <Section step="4" title="遊び方">
          サイコロを振って進み、止まったマスでステータスが変化したりイベントが起きます。選択イベントでは選択肢を選び、全体イベントは全員に影響します。
        </Section>

        <Section step="5" title="勝利条件">
          最終スコア＝到達地点＋各ステータス＋宇宙貢献度＋達成した人生目標。資金だけでは勝てません。
        </Section>

        <Section step="6" title="人数">
          1〜8人。ソロのスコアアタックも、CPUを追加して遊ぶこともできます。
        </Section>

        <div className="mt-6">
          <Button variant="lime" fullWidth onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
