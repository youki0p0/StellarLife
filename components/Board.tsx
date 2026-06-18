"use client";

import { useEffect, useRef } from "react";
import { BOARD, SEGMENTS } from "@/lib/game/board";
import type { PlayerState } from "@/lib/game/types";
import { ACCENT_BG, ACCENT_BORDER, ACCENT_TEXT, accent } from "./ui";

// A winding, board-game style path (boustrophedon snake) so the journey reads
// as a single road from Earth to deep space — like Mario Party / 人生ゲーム —
// instead of a tall stack of lists. The view auto-scrolls to the active token.

const COLS = 6;

const KIND_GLYPH: Record<string, string> = {
  start: "◎",
  event: "?",
  stat: "+",
  mission: "★",
  gate: "↑",
  goal: "✦",
};

function gridPos(index: number): { row: number; col: number } {
  const row = Math.floor(index / COLS);
  const inRow = index % COLS;
  // Even rows go left→right, odd rows right→left, so consecutive tiles touch.
  const col = row % 2 === 0 ? inRow : COLS - 1 - inRow;
  return { row, col };
}

export function Board({
  players,
  activeId,
}: {
  players: PlayerState[];
  activeId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTileRef = useRef<HTMLDivElement>(null);

  const tokensByTile = new Map<number, PlayerState[]>();
  for (const p of players) {
    const list = tokensByTile.get(p.position) ?? [];
    list.push(p);
    tokensByTile.set(p.position, list);
  }
  const activePos = activeId
    ? players.find((p) => p.id === activeId)?.position ?? null
    : null;

  // Keep the active player's space in view as they move.
  useEffect(() => {
    activeTileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, [activePos]);

  const rows = Math.ceil(BOARD.length / COLS);

  return (
    <div ref={scrollRef} className="h-full overflow-auto p-2">
      <div
        className="relative mx-auto grid w-full max-w-xl gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {BOARD.map((tile) => {
          const { row, col } = gridPos(tile.index);
          const seg = SEGMENTS[tile.segment];
          const a = accent(seg.accent);
          const tokens = tokensByTile.get(tile.index) ?? [];
          const isActiveTile = tile.index === activePos;
          return (
            <div
              key={tile.index}
              ref={isActiveTile ? activeTileRef : undefined}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
              className={`relative flex aspect-square flex-col justify-between rounded-md border ${ACCENT_BORDER[a]} bg-panel/70 p-1 ${
                isActiveTile ? "ring-2 ring-white/80" : ""
              }`}
            >
              <div className="flex items-start justify-between leading-none">
                <span className={`text-sm ${ACCENT_TEXT[a]}`}>
                  {KIND_GLYPH[tile.kind] ?? "·"}
                </span>
                <span className="text-[7px] text-slate-500">{tile.index}</span>
              </div>
              <div className="truncate text-[7px] leading-tight text-slate-300">
                {tile.label}
              </div>
              {tokens.length > 0 && (
                <div className="absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-0.5">
                  {tokens.map((p) => (
                    <span
                      key={p.id}
                      title={p.name}
                      className={`h-2.5 w-2.5 rounded-full border border-void ${ACCENT_BG[accent(p.color)]}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
