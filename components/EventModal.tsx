"use client";

import { describeDelta } from "@/lib/game/stats";
import type { PendingChoice } from "@/lib/game/types";

export function EventModal({
  pending,
  canChoose,
  chooserName,
  onChoose,
}: {
  pending: PendingChoice;
  canChoose: boolean;
  chooserName: string;
  onChoose: (choiceId: string) => void;
}) {
  const { card } = pending;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-void/80 px-4">
      <div className="scanlines relative w-full max-w-sm overflow-hidden rounded-lg border-2 border-neon-magenta bg-panel p-5 shadow-neon">
        <div className="text-[10px] text-neon-magenta">イベント</div>
        <h2 className="mt-1 text-base font-bold text-neon-cyan">{card.title}</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
          {card.description}
        </p>

        <div className="mt-4 space-y-2">
          {card.choices?.map((c) => (
            <button
              key={c.id}
              disabled={!canChoose}
              onClick={() => onChoose(c.id)}
              className="w-full rounded border-2 border-neon-gold bg-neon-gold/5 px-3 py-2 text-left transition enabled:hover:bg-neon-gold/15 enabled:active:scale-95 disabled:cursor-not-allowed disabled:border-grid"
            >
              <div className="text-sm font-bold text-neon-gold">{c.label}</div>
              <div className="text-[10px] text-slate-400">
                {describeDelta(c.delta) || "効果なし"}
              </div>
            </button>
          ))}
        </div>

        {!canChoose && (
          <p className="mt-3 text-center text-[10px] text-slate-500">
            {chooserName} の選択を待っています…
          </p>
        )}
      </div>
    </div>
  );
}
