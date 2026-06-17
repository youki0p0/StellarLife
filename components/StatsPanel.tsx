import { STAT_KEYS, STAT_META } from "@/lib/game/stats";
import type { PlayerState } from "@/lib/game/types";
import { ACCENT_TEXT, accent } from "./ui";

export function StatsPanel({ player }: { player: PlayerState }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {STAT_KEYS.map((key) => {
        const meta = STAT_META[key];
        const a = accent(meta.accent);
        return (
          <div
            key={key}
            className="rounded border border-grid bg-void/70 px-1.5 py-1 text-center"
          >
            <div className={`text-[9px] ${ACCENT_TEXT[a]}`}>{meta.label}</div>
            <div className="text-sm font-bold tabular-nums text-slate-100">
              {player.stats[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
