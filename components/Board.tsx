"use client";

import { useEffect, useRef } from "react";
import { BOARD, SEGMENTS } from "@/lib/game/board";
import type { PlayerState, RouteId, Tile, TileKind } from "@/lib/game/types";
import { Rocket, Saturn, Star } from "./sprites";
import { ACCENT_BG, ACCENT_BORDER, ACCENT_TEXT, accent } from "./ui";

// The journey reads as a road from Earth to deep space. Earth + low orbit and
// deep space are drawn as a compact winding (boustrophedon) path; the middle
// is drawn as two parallel lanes — Moon (top) and Mars (bottom) — so the
// branch is visible on the board and each token sits in its chosen lane.

const COLS = 6;

const KIND_GLYPH: Record<string, string> = {
  start: "◎",
  event: "?",
  stat: "+",
  mission: "★",
  gate: "↑",
  branch: "⋔",
  goal: "✦",
};

function TileMark({ kind }: { kind: TileKind }) {
  if (kind === "gate") return <Rocket size={14} />;
  if (kind === "goal") return <Saturn size={16} />;
  if (kind === "mission") return <Star size={12} color="#9dff5a" />;
  return null;
}

function Tokens({ players }: { players: PlayerState[] }) {
  if (players.length === 0) return null;
  return (
    <div className="absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-0.5">
      {players.map((p) => (
        <span
          key={p.id}
          title={p.name}
          className={`h-2.5 w-2.5 rounded-full border border-void ${ACCENT_BG[accent(p.color)]}`}
        />
      ))}
    </div>
  );
}

export function Board({
  players,
  activeId,
}: {
  players: PlayerState[];
  activeId: string | null;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  const tokensByTile = new Map<number, PlayerState[]>();
  for (const p of players) {
    const list = tokensByTile.get(p.position) ?? [];
    list.push(p);
    tokensByTile.set(p.position, list);
  }
  const activePlayer = activeId
    ? players.find((p) => p.id === activeId)
    : undefined;
  const activePos = activePlayer ? activePlayer.position : null;

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, [activePos]);

  const pre = BOARD.filter(
    (t) => t.segment === "earth" || t.segment === "low_orbit",
  );
  const mid = BOARD.filter((t) => t.segment === "mid");
  const post = BOARD.filter((t) => t.segment === "deep_space");

  function tilesOf(tile: Tile) {
    return tokensByTile.get(tile.index) ?? [];
  }
  function refFor(tile: Tile) {
    return tile.index === activePos ? activeRef : undefined;
  }

  return (
    <div className="h-full space-y-3 overflow-auto p-2">
      <SerpBlock tiles={pre} tilesOf={tilesOf} refFor={refFor} />
      <MidBlock tiles={mid} tilesOf={tilesOf} activePos={activePos} activeRef={activeRef} />
      <SerpBlock tiles={post} tilesOf={tilesOf} refFor={refFor} />
    </div>
  );
}

// --- a compact serpentine block (Earth/low orbit, deep space) ----------

function gridPos(i: number): { row: number; col: number } {
  const row = Math.floor(i / COLS);
  const inRow = i % COLS;
  const col = row % 2 === 0 ? inRow : COLS - 1 - inRow;
  return { row, col };
}

function SerpBlock({
  tiles,
  tilesOf,
  refFor,
}: {
  tiles: Tile[];
  tilesOf: (t: Tile) => PlayerState[];
  refFor: (t: Tile) => React.RefObject<HTMLDivElement | null> | undefined;
}) {
  const rows = Math.ceil(tiles.length / COLS);
  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {tiles.map((tile, i) => {
        const { row, col } = gridPos(i);
        const a = accent(SEGMENTS[tile.segment].accent);
        return (
          <div
            key={tile.index}
            ref={refFor(tile)}
            style={{ gridColumn: col + 1, gridRow: row + 1 }}
            className={`relative flex aspect-square flex-col justify-between rounded-md border ${ACCENT_BORDER[a]} bg-panel/70 p-1 ${
              refFor(tile) ? "ring-2 ring-white/80" : ""
            }`}
          >
            <div className="flex items-start justify-between leading-none">
              {tile.kind === "gate" ||
              tile.kind === "goal" ||
              tile.kind === "mission" ? (
                <TileMark kind={tile.kind} />
              ) : (
                <span className={`text-sm ${ACCENT_TEXT[a]}`}>
                  {KIND_GLYPH[tile.kind] ?? "·"}
                </span>
              )}
              <span className="text-[7px] text-slate-500">{tile.index}</span>
            </div>
            <div className="truncate text-[7px] leading-tight text-slate-300">
              {tile.label}
            </div>
            <Tokens players={tilesOf(tile)} />
          </div>
        );
      })}
    </div>
  );
}

// --- the branched middle: two parallel lanes (Moon / Mars) -------------

function MidBlock({
  tiles,
  tilesOf,
  activePos,
  activeRef,
}: {
  tiles: Tile[];
  tilesOf: (t: Tile) => PlayerState[];
  activePos: number | null;
  activeRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="rounded-md border border-neon-violet/60 bg-panel/40 p-2">
      <div className="mb-1 flex items-center justify-between text-[9px]">
        <span className="text-neon-violet">月ルート</span>
        <span className="text-slate-500">分岐</span>
        <span className="text-neon-red">火星ルート</span>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {tiles.map((tile) => (
          <div
            key={tile.index}
            ref={tile.index === activePos ? activeRef : undefined}
            className="w-16 shrink-0"
          >
            {tile.variants ? (
              <div className="flex flex-col gap-1">
                <LaneCell
                  tile={tile}
                  route="moon"
                  players={tilesOf(tile).filter((p) => p.route === "moon")}
                />
                <LaneCell
                  tile={tile}
                  route="mars"
                  players={tilesOf(tile).filter((p) => p.route === "mars")}
                />
              </div>
            ) : (
              <SharedCell tile={tile} players={tilesOf(tile)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneCell({
  tile,
  route,
  players,
}: {
  tile: Tile;
  route: RouteId;
  players: PlayerState[];
}) {
  const a = route === "moon" ? "violet" : "red";
  const v = tile.variants![route];
  return (
    <div
      className={`relative flex h-12 flex-col justify-between rounded border ${ACCENT_BORDER[a]} bg-panel/70 p-1`}
    >
      <div className="flex items-start justify-between leading-none">
        {tile.kind === "mission" ? (
          <Star size={11} color={route === "moon" ? "#9b6bff" : "#ff5a6e"} />
        ) : (
          <span className={`text-[10px] ${ACCENT_TEXT[a]}`}>
            {KIND_GLYPH[tile.kind] ?? "+"}
          </span>
        )}
        <span className="text-[7px] text-slate-500">{tile.index}</span>
      </div>
      <div className="truncate text-[7px] leading-tight text-slate-300">
        {v.label}
      </div>
      <Tokens players={players} />
    </div>
  );
}

function SharedCell({
  tile,
  players,
}: {
  tile: Tile;
  players: PlayerState[];
}) {
  const a = accent(SEGMENTS[tile.segment].accent);
  return (
    <div
      className={`relative flex h-[6.25rem] flex-col justify-between rounded border ${ACCENT_BORDER[a]} bg-panel/70 p-1`}
    >
      <div className="flex items-start justify-between leading-none">
        {tile.kind === "gate" ? (
          <Rocket size={14} />
        ) : (
          <span className={`text-sm ${ACCENT_TEXT[a]}`}>
            {KIND_GLYPH[tile.kind] ?? "·"}
          </span>
        )}
        <span className="text-[7px] text-slate-500">{tile.index}</span>
      </div>
      <div className="truncate text-[8px] leading-tight text-slate-200">
        {tile.label}
      </div>
      <Tokens players={players} />
    </div>
  );
}
