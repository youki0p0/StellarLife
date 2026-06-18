"use client";

import { useState } from "react";
import { saveName } from "@/lib/clientId";
import { uuid } from "@/lib/clientId";
import {
  canStart,
  MAX_SEATS,
  type RoomAction,
  type RoomState,
} from "@/lib/room";
import { Button } from "./Button";
import { ACCENT_BG, type Accent } from "./ui";

const SEAT_COLORS: Accent[] = [
  "cyan",
  "magenta",
  "lime",
  "gold",
  "violet",
  "red",
  "cyan",
  "magenta",
];

export function Lobby({
  code,
  state,
  clientId,
  online,
  dispatch,
}: {
  code: string;
  state: RoomState;
  clientId: string;
  online: boolean;
  dispatch: (a: RoomAction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const mySeat = state.seats.find((s) => s.clientId === clientId);
  const isHost = state.hostClientId === clientId;
  const startable = canStart(state);

  function copyCode() {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8">
      <header className="text-center">
        <h1 className="text-xl font-bold tracking-widest text-neon-cyan text-shadow-neon">
          ロビー
        </h1>
        <button
          onClick={copyCode}
          className="mt-2 rounded border-2 border-neon-gold bg-neon-gold/10 px-4 py-1.5 text-lg tracking-[0.3em] text-neon-gold"
        >
          {code}
        </button>
        <p className="mt-1 text-[10px] text-slate-500">
          {copied ? "コピーしました" : "タップでコードをコピー"}
          {online ? " / オンライン" : " / ローカル"}
        </p>
      </header>

      <ul className="space-y-2">
        {state.seats.map((seat, i) => {
          const mine = seat.clientId === clientId;
          const a = SEAT_COLORS[i % SEAT_COLORS.length];
          return (
            <li
              key={seat.id}
              className="flex items-center gap-2 rounded border-2 border-grid bg-panel/70 px-3 py-2"
            >
              <span className={`h-3 w-3 rounded-full ${ACCENT_BG[a]}`} />
              {mine && !seat.isCpu ? (
                <input
                  defaultValue={seat.name}
                  maxLength={12}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== seat.name) {
                      saveName(name);
                      dispatch({ type: "RENAME", seatId: seat.id, name });
                    }
                  }}
                  className="flex-1 rounded bg-void px-2 py-1 text-sm text-slate-100 outline-none"
                />
              ) : (
                <span className="flex-1 text-sm text-slate-200">{seat.name}</span>
              )}

              {seat.isCpu ? (
                <span className="text-[10px] text-neon-violet">CPU</span>
              ) : seat.ready ? (
                <span className="text-[10px] text-neon-lime">準備OK</span>
              ) : (
                <span className="text-[10px] text-slate-500">待機中</span>
              )}

              {mine && !seat.isCpu && (
                <Button
                  variant="lime"
                  size="sm"
                  onClick={() => dispatch({ type: "TOGGLE_READY", seatId: seat.id })}
                >
                  {seat.ready ? "解除" : "準備"}
                </Button>
              )}
              {(isHost || mine || seat.isCpu) && (
                <Button
                  variant="red"
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_SEAT",
                      seatId: seat.id,
                      byClientId: clientId,
                    })
                  }
                >
                  ×
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        {!mySeat && (
          <Button
            variant="cyan"
            size="md"
            className="flex-1"
            onClick={() =>
              dispatch({
                type: "JOIN",
                clientId,
                seatId: uuid(),
                name: "プレイヤー",
              })
            }
          >
            着席する
          </Button>
        )}
        <Button
          variant="violet"
          size="md"
          className="flex-1"
          disabled={state.seats.length >= MAX_SEATS}
          onClick={() => dispatch({ type: "ADD_CPU", seatId: uuid() })}
        >
          CPUを追加
        </Button>
      </div>

      {isHost ? (
        <Button
          variant="lime"
          size="lg"
          fullWidth
          disabled={!startable}
          onClick={() => dispatch({ type: "START", byClientId: clientId })}
        >
          {startable ? "ゲーム開始" : "全員の準備を待っています"}
        </Button>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          ホストの開始を待っています…
        </p>
      )}
    </main>
  );
}
