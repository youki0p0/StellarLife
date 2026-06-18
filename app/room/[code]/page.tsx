"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Board } from "@/components/Board";
import { Button, buttonClass } from "@/components/Button";
import { CoopBar } from "@/components/CoopBar";
import { Dice } from "@/components/Dice";
import { EventFlashPopup } from "@/components/EventFlash";
import { EventModal } from "@/components/EventModal";
import { Lobby } from "@/components/Lobby";
import { LogFeed } from "@/components/LogFeed";
import { Results } from "@/components/Results";
import { Rocket } from "@/components/sprites";
import { BgmToggle } from "@/components/BgmToggle";
import { SoundToggle } from "@/components/SoundToggle";
import { ACCENT_BG, ACCENT_TEXT, accent } from "@/components/ui";
import { activePlayerId } from "@/lib/game/cpu";
import { SEGMENT_ORDER, segmentRank, tileAt } from "@/lib/game/board";
import { STAT_KEYS, STAT_META } from "@/lib/game/stats";
import type { GameState, PlayerState } from "@/lib/game/types";
import type { RoomState } from "@/lib/room";
import { useRoom } from "@/store/useRoom";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toString().toUpperCase();
  const room = useRoom(code);

  if (room.status === "connecting" || !room.state) {
    return <Centered text="接続中…" />;
  }
  if (room.status === "error") {
    return (
      <Centered text={`接続エラー: ${room.error ?? "不明"}`}>
        <p className="max-w-xs text-[10px] leading-relaxed text-slate-500">
          {room.online
            ? "Supabase に接続できませんでした。schema.sql の実行、環境変数 (URL / publishable key)、プロジェクトが一時停止していないかを確認してください。"
            : "環境変数が読み込まれていないため、ローカルモードです。"}
        </p>
        <div className="flex gap-3">
          <Button variant="lime" size="md" onClick={() => window.location.reload()}>
            再試行
          </Button>
          <Link href="/" className={buttonClass("cyan", "md")}>
            ホームに戻る
          </Link>
        </div>
      </Centered>
    );
  }

  const state = room.state;
  const isHost = state.hostClientId === room.clientId;

  if (state.phase === "lobby") {
    return (
      <Lobby
        code={code}
        state={state}
        clientId={room.clientId}
        online={room.online}
        dispatch={room.dispatch}
      />
    );
  }

  if (state.phase === "finished" && state.game) {
    return (
      <Results
        game={state.game}
        isHost={isHost}
        clientId={room.clientId}
        onRestart={room.dispatch}
      />
    );
  }

  if (state.phase === "playing" && state.game) {
    return (
      <GameView
        state={state}
        game={state.game}
        isMyTurn={room.isMyTurn}
        clientId={room.clientId}
        onRoll={(playerId) =>
          room.dispatch({ type: "GAME", action: { type: "ROLL", playerId } })
        }
        onChoose={(playerId, choiceId) =>
          room.dispatch({
            type: "GAME",
            action: { type: "CHOOSE", playerId, choiceId },
          })
        }
      />
    );
  }

  return <Centered text="読み込み中…" />;
}

function GameView({
  state,
  game,
  isMyTurn,
  clientId,
  onRoll,
  onChoose,
}: {
  state: RoomState;
  game: GameState;
  isMyTurn: boolean;
  clientId: string;
  onRoll: (playerId: string) => void;
  onChoose: (playerId: string, choiceId: string) => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const players = game.turnOrder.map((id) => game.players[id]);
  const activeId = activePlayerId(game);
  const active = activeId ? game.players[activeId] : null;
  const activeIsCpu = active?.isCpu ?? false;
  const canRoll = isMyTurn && !game.pending;

  // Map the acting game player back to the seat owner to gate the choice UI.
  const activeSeat = state.seats.find((s) => s.id === activeId);
  const iControlActive = activeSeat?.clientId === clientId;
  const latestLog = game.log[game.log.length - 1];

  return (
    <main className="relative mx-auto flex h-[100dvh] max-w-3xl flex-col overflow-hidden">
      {/* Top bar: title, turn counter, log toggle */}
      <header className="flex shrink-0 items-center justify-between px-3 py-2">
        <Link href="/" className="text-[10px] text-slate-500">
          ← STELLAR LIFE
        </Link>
        <span className="text-[10px] text-slate-500">
          ターン {game.turnCount}/{game.maxTurns}
        </span>
        <div className="flex items-center gap-2">
          <BgmToggle />
          <SoundToggle />
          <Button variant="cyan" size="sm" onClick={() => setLogOpen(true)}>
            ログ
          </Button>
        </div>
      </header>

      {/* Player chips (horizontal scroll) */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2">
        {players.map((p) => (
          <PlayerChip key={p.id} player={p} active={p.id === activeId} />
        ))}
      </div>

      <div className="px-3 pb-2">
        <CoopBar coop={game.coop} />
      </div>

      {/* Board: the hero, fills remaining space and scrolls internally */}
      <div className="min-h-0 flex-1">
        <Board players={players} activeId={activeId} />
      </div>

      {/* Bottom action bar: active player + stats strip + dice */}
      <footer className="shrink-0 border-t-2 border-grid bg-panel/90 px-3 pb-3 pt-2">
        {active && (
          <>
            <div className="mb-1 flex items-center gap-2">
              <Rocket size={18} />
              <span
                className={`text-sm font-bold ${ACCENT_TEXT[accent(active.color)]}`}
              >
                {active.name} のターン
                {activeIsCpu && (
                  <span className="ml-2 text-[10px] text-slate-400">
                    CPU思考中…
                  </span>
                )}
              </span>
            </div>
            <StatStrip player={active} />
          </>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="flex-1 truncate text-[10px] text-slate-400">
            {latestLog?.text}
          </p>
          <Dice
            value={game.lastRoll?.value ?? null}
            canRoll={canRoll}
            onRoll={() => activeId && onRoll(activeId)}
            label={
              game.pending
                ? "イベント中"
                : isMyTurn
                  ? "サイコロを振る"
                  : activeIsCpu
                    ? "CPUの番"
                    : "相手の番"
            }
          />
        </div>
      </footer>

      <EventFlashPopup flash={game.pending ? null : game.lastEvent} />

      {game.pending && (
        <EventModal
          pending={game.pending}
          canChoose={iControlActive && !activeIsCpu}
          chooserName={game.players[game.pending.playerId]?.name ?? ""}
          onChoose={(choiceId) => onChoose(game.pending!.playerId, choiceId)}
        />
      )}

      {logOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col justify-end bg-void/70"
          onClick={() => setLogOpen(false)}
        >
          <div
            className="rounded-t-lg border-t-2 border-neon-cyan bg-panel p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-neon-cyan">ログ</span>
              <button
                onClick={() => setLogOpen(false)}
                className="text-[11px] text-slate-400"
              >
                閉じる
              </button>
            </div>
            <LogFeed log={game.log} />
          </div>
        </div>
      )}
    </main>
  );
}

/** Compact per-player chip used in the top bar. */
function PlayerChip({
  player,
  active,
}: {
  player: PlayerState;
  active: boolean;
}) {
  const a = accent(player.color);
  const seg = tileAt(player.position).segment;
  const routeLabel = player.route === "moon" ? "月" : player.route === "mars" ? "火星" : null;
  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 ${
        active ? "border-white/80 bg-void" : "border-grid bg-void/50"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${ACCENT_BG[a]}`} />
      <span className={`text-[10px] font-bold ${ACCENT_TEXT[a]}`}>
        {player.name}
        {player.finished && " ✦"}
      </span>
      {routeLabel && (
        <span className="text-[8px] text-neon-violet">{routeLabel}</span>
      )}
      <span className="text-[8px] text-slate-500">
        {segmentRank(seg) + 1}/{SEGMENT_ORDER.length}
      </span>
    </div>
  );
}

/** Horizontal strip of all eight stats for the active player. */
function StatStrip({ player }: { player: PlayerState }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {STAT_KEYS.map((key) => {
        const meta = STAT_META[key];
        const a = accent(meta.accent);
        return (
          <div
            key={key}
            className="flex min-w-[2.4rem] flex-1 flex-col items-center rounded border border-grid bg-void/70 px-1 py-0.5"
          >
            <span className={`text-[8px] ${ACCENT_TEXT[a]}`}>{meta.label}</span>
            <span className="text-xs font-bold tabular-nums text-slate-100">
              {player.stats[key]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Centered({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
      <p className="text-sm text-neon-cyan">{text}</p>
      {children}
    </main>
  );
}
