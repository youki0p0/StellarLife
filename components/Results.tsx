"use client";

import { achievementLabel } from "@/lib/game/achievements";
import { rankings } from "@/lib/game/score";
import type { GameState } from "@/lib/game/types";
import type { RoomAction } from "@/lib/room";
import { Button } from "./Button";
import { ACCENT_TEXT, accent } from "./ui";

export function Results({
  game,
  isHost,
  clientId,
  onRestart,
}: {
  game: GameState;
  isHost: boolean;
  clientId: string;
  onRestart: (a: RoomAction) => void;
}) {
  const ranked = rankings(game);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-8">
      <header className="text-center">
        <h1 className="text-xl font-bold tracking-widest text-neon-gold text-shadow-neon">
          最終スコア
        </h1>
        <p className="mt-1 text-[10px] text-slate-400">
          最も伝説的な人生を歩んだのは…
        </p>
      </header>

      <ol className="space-y-2">
        {ranked.map((s, i) => {
          const p = game.players[s.playerId];
          const a = accent(p.color);
          const isWinner = i === 0;
          return (
            <li
              key={s.playerId}
              className={`rounded-lg border-2 ${
                isWinner ? "border-neon-gold shadow-neon" : "border-grid"
              } bg-panel/70 p-3`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${ACCENT_TEXT[a]}`}>
                  {i + 1}位 {p.name}
                  {isWinner && (
                    <span className="ml-2 text-[10px] text-neon-gold">
                      LEGEND
                    </span>
                  )}
                </span>
                <span className="text-lg font-bold tabular-nums text-neon-cyan">
                  {s.total}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-4 gap-x-2 gap-y-0.5 text-[9px] text-slate-400">
                <span>到達 {s.reached}</span>
                <span>資金 {s.money}</span>
                <span>技術 {s.skill}</span>
                <span>名声 {s.reputation}</span>
                <span>仲間 {s.crew}</span>
                <span>夢 {s.dream}</span>
                <span>貢献 {s.contribution}</span>
                <span>目標 {s.goals}</span>
              </div>
              {p.achievements.length > 0 && (
                <div className="mt-1 text-[9px] text-neon-violet">
                  {p.achievements.map(achievementLabel).join(" / ")}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {isHost ? (
        <Button
          variant="lime"
          size="lg"
          fullWidth
          onClick={() => onRestart({ type: "RESTART", byClientId: clientId })}
        >
          もう一度遊ぶ
        </Button>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          ホストが次のゲームを準備できます。
        </p>
      )}
    </main>
  );
}
