"use client";

import { useEffect, useMemo, useState } from "react";
import { achievementLabel } from "@/lib/game/achievements";
import { rankings } from "@/lib/game/score";
import type { GameState, LogEntry } from "@/lib/game/types";
import { playSfx } from "@/lib/sfx";
import { Button } from "./Button";
import { Planet, Rocket, Saturn, Star } from "./sprites";
import { ACCENT_TEXT, accent } from "./ui";

const TONE: Record<string, string> = {
  good: "text-neon-lime",
  bad: "text-neon-red",
  global: "text-neon-magenta",
  info: "text-slate-300",
};

export function Results({
  game,
  isHost,
  clientId,
  onRestart,
}: {
  game: GameState;
  isHost: boolean;
  clientId: string;
  onRestart: (a: { type: "RESTART"; byClientId: string }) => void;
}) {
  const ranked = useMemo(() => rankings(game), [game]);
  // Awards ceremony: reveal from last place up to the winner, one at a time.
  const [revealed, setRevealed] = useState(0);
  const [openDiary, setOpenDiary] = useState<string | null>(null);

  const total = ranked.length;
  const allRevealed = revealed >= total;
  const winnerRevealed = allRevealed && total > 0;

  // The lowest `revealed` ranks, shown in rank order (winner appears last/top).
  const visible = ranked.slice(total - revealed);

  useEffect(() => {
    if (winnerRevealed) playSfx("win");
  }, [winnerRevealed]);

  function revealNext() {
    if (allRevealed) return;
    const next = revealed + 1;
    // The final reveal is the winner — punchier sound.
    playSfx(next >= total ? "win" : "good");
    setRevealed(next);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-4 px-5 py-8">
      <header className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Planet kind="earth" size={20} />
          <Planet kind="moon" size={18} />
          <Planet kind="mars" size={18} />
          <Saturn size={20} />
        </div>
        <h1 className="text-xl font-bold tracking-widest text-neon-gold text-shadow-neon">
          表彰式
        </h1>
        <p className="mt-1 text-[10px] text-slate-400">
          最も伝説的な人生を歩んだのは…
        </p>
      </header>

      {revealed === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Rocket size={48} />
          <p className="text-center text-[11px] text-slate-400">
            {total}人の人生が幕を閉じた。結果を発表しよう。
          </p>
          <Button variant="gold" size="lg" onClick={revealNext}>
            結果を発表
          </Button>
        </div>
      ) : (
        <ol className="space-y-2">
          {visible.map((s) => {
            const p = game.players[s.playerId];
            const a = accent(p.color);
            const place = ranked.findIndex((r) => r.playerId === s.playerId) + 1;
            const isWinner = place === 1;
            const diary = game.log.filter((l) => l.playerId === s.playerId);
            const open = openDiary === s.playerId;
            return (
              <li
                key={s.playerId}
                className={`event-pop rounded-lg border-2 ${
                  isWinner ? "border-neon-gold shadow-neon" : "border-grid"
                } bg-panel/70 p-3`}
              >
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setOpenDiary(open ? null : s.playerId)}
                >
                  <span
                    className={`flex items-center gap-1.5 text-sm font-bold ${ACCENT_TEXT[a]}`}
                  >
                    {isWinner && <Star size={16} />}
                    {place}位 {p.name}
                    {isWinner && (
                      <span className="text-[10px] text-neon-gold">LEGEND</span>
                    )}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-neon-cyan">
                    {s.total}
                  </span>
                </button>

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

                <button
                  className="mt-1 text-[10px] text-slate-500 underline"
                  onClick={() => setOpenDiary(open ? null : s.playerId)}
                >
                  {open ? "日記を閉じる" : "人生の日記を見る"}
                </button>
                {open && <Diary entries={diary} name={p.name} />}
              </li>
            );
          })}
        </ol>
      )}

      {revealed > 0 && !allRevealed && (
        <Button variant="gold" size="lg" fullWidth onClick={revealNext}>
          次を発表
        </Button>
      )}

      {allRevealed &&
        (isHost ? (
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
        ))}
    </main>
  );
}

/** A player's journey told back as a diary, built from their log entries. */
function Diary({ entries, name }: { entries: LogEntry[]; name: string }) {
  if (entries.length === 0) {
    return (
      <p className="mt-2 text-[10px] text-slate-500">
        {name} の記録は残っていない。
      </p>
    );
  }
  return (
    <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded border border-grid bg-void/70 p-2">
      {entries.map((e) => (
        <div key={e.id} className={`text-[10px] ${TONE[e.tone ?? "info"]}`}>
          <span className="text-slate-600">T{e.turn} </span>
          {e.text}
        </div>
      ))}
    </div>
  );
}
