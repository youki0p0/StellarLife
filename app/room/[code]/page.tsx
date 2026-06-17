"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Board } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { EventModal } from "@/components/EventModal";
import { Lobby } from "@/components/Lobby";
import { LogFeed } from "@/components/LogFeed";
import { Results } from "@/components/Results";
import { StatsPanel } from "@/components/StatsPanel";
import { ACCENT_TEXT, accent } from "@/components/ui";
import { activePlayerId } from "@/lib/game/cpu";
import { segmentRank } from "@/lib/game/board";
import { tileAt } from "@/lib/game/board";
import { SEGMENTS } from "@/lib/game/board";
import type { GameState } from "@/lib/game/types";
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
        <Link href="/" className="text-neon-cyan underline">
          ホームに戻る
        </Link>
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
  const players = game.turnOrder.map((id) => game.players[id]);
  const activeId = activePlayerId(game);
  const active = activeId ? game.players[activeId] : null;
  const activeIsCpu = active?.isCpu ?? false;
  const canRoll = isMyTurn && !game.pending;

  // Map the acting game player back to the seat owner to gate the choice UI.
  const activeSeat = state.seats.find((s) => s.id === activeId);
  const iControlActive = activeSeat?.clientId === clientId;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-4">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-[10px] text-slate-500">
          ← STELLAR LIFE
        </Link>
        <span className="text-[10px] text-slate-500">
          ターン {game.turnCount} / {game.maxTurns}
        </span>
      </header>

      <div className="rounded border-2 border-grid bg-panel/70 px-3 py-2 text-center">
        {active && (
          <span className={`text-sm font-bold ${ACCENT_TEXT[accent(active.color)]}`}>
            {active.name} のターン
            {activeIsCpu && (
              <span className="ml-2 text-[10px] text-slate-400">CPU思考中…</span>
            )}
          </span>
        )}
      </div>

      <Board players={players} />

      {/* Players overview */}
      <div className="grid grid-cols-2 gap-1.5">
        {players.map((p) => {
          const seg = SEGMENTS[tileAt(p.position).segment];
          const a = accent(p.color);
          const isActive = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`rounded border ${
                isActive ? "border-neon-cyan" : "border-grid"
              } bg-void/60 px-2 py-1`}
            >
              <div className="flex items-center justify-between">
                <span className={`truncate text-[11px] font-bold ${ACCENT_TEXT[a]}`}>
                  {p.name}
                  {p.finished && " ✦"}
                </span>
                <span className="text-[8px] text-slate-500">
                  {segmentRank(seg.id) + 1}/5
                </span>
              </div>
              <div className="text-[8px] text-slate-400">{seg.name}</div>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="rounded border-2 border-grid bg-panel/70 p-2">
          <div className={`mb-1 text-[10px] ${ACCENT_TEXT[accent(active.color)]}`}>
            {active.name} のステータス
          </div>
          <StatsPanel player={active} />
        </div>
      )}

      <div className="flex items-center justify-center py-1">
        <Dice
          value={game.lastRoll?.value ?? null}
          canRoll={canRoll}
          onRoll={() => activeId && onRoll(activeId)}
          label={
            game.pending
              ? "イベント処理中"
              : isMyTurn
                ? "サイコロを振る"
                : activeIsCpu
                  ? "CPUの番"
                  : "相手の番"
          }
        />
      </div>

      <LogFeed log={game.log} />

      {game.pending && (
        <EventModal
          pending={game.pending}
          canChoose={iControlActive && !activeIsCpu}
          chooserName={game.players[game.pending.playerId]?.name ?? ""}
          onChoose={(choiceId) => onChoose(game.pending!.playerId, choiceId)}
        />
      )}
    </main>
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
