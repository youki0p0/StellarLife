import { BOARD, SEGMENTS, SEGMENT_ORDER } from "@/lib/game/board";
import type { PlayerState, SegmentId } from "@/lib/game/types";
import { ACCENT_BG, ACCENT_BORDER, ACCENT_TEXT, accent } from "./ui";

const KIND_GLYPH: Record<string, string> = {
  start: "◎",
  event: "?",
  stat: "+",
  mission: "★",
  gate: "↑",
  goal: "✦",
};

export function Board({ players }: { players: PlayerState[] }) {
  const tokensByTile = new Map<number, PlayerState[]>();
  for (const p of players) {
    const list = tokensByTile.get(p.position) ?? [];
    list.push(p);
    tokensByTile.set(p.position, list);
  }

  return (
    <div className="space-y-3">
      {SEGMENT_ORDER.map((segId) => (
        <Segment
          key={segId}
          segId={segId}
          tokensByTile={tokensByTile}
        />
      ))}
    </div>
  );
}

function Segment({
  segId,
  tokensByTile,
}: {
  segId: SegmentId;
  tokensByTile: Map<number, PlayerState[]>;
}) {
  const seg = SEGMENTS[segId];
  const a = accent(seg.accent);
  const tiles = BOARD.filter((t) => t.segment === segId);

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h3 className={`text-[11px] font-bold tracking-wider ${ACCENT_TEXT[a]}`}>
          {seg.name}
        </h3>
        {seg.fuelGate > 0 && (
          <span className="text-[9px] text-neon-red">燃料ゲート {seg.fuelGate}</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {tiles.map((tile) => {
          const tokens = tokensByTile.get(tile.index) ?? [];
          return (
            <div
              key={tile.index}
              className={`relative flex min-h-[52px] flex-col justify-between rounded border ${ACCENT_BORDER[a]} bg-panel/60 p-1`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-[10px] ${ACCENT_TEXT[a]}`}>
                  {KIND_GLYPH[tile.kind] ?? "·"}
                </span>
                <span className="text-[8px] text-slate-500">{tile.index}</span>
              </div>
              <div className="truncate text-[8px] leading-tight text-slate-300">
                {tile.label}
              </div>
              {tokens.length > 0 && (
                <div className="absolute -right-1 -top-1 flex flex-wrap gap-0.5">
                  {tokens.map((p) => (
                    <span
                      key={p.id}
                      title={p.name}
                      className={`h-3 w-3 rounded-full border border-void ${ACCENT_BG[accent(p.color)]}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
