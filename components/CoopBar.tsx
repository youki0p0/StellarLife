import { describeDelta } from "@/lib/game/stats";
import type { CoopMission } from "@/lib/game/types";

// Shared co-op mission progress, shown above the board so the whole table can
// see how close everyone is to the collaborative goal.
export function CoopBar({ coop }: { coop: CoopMission | null }) {
  if (!coop) return null;
  const pct = Math.min(100, Math.round((coop.progress / coop.goal) * 100));
  return (
    <div className="shrink-0 rounded border border-grid bg-void/60 px-3 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-neon-lime">
          共同: {coop.title}
        </span>
        <span className="text-[9px] tabular-nums text-slate-400">
          {coop.done ? "達成!" : `${coop.progress}/${coop.goal}`}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-grid">
        <div
          className={`h-full ${coop.done ? "bg-neon-gold" : "bg-neon-lime"}`}
          style={{ width: `${coop.done ? 100 : pct}%` }}
        />
      </div>
      {!coop.done && (
        <div className="mt-0.5 text-[8px] text-slate-500">
          達成報酬(全員): {describeDelta(coop.reward)}
        </div>
      )}
    </div>
  );
}
