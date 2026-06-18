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
                <button
                  onClick={() => dispatch({ type: "TOGGLE_READY", seatId: seat.id })}
                  className="rounded border border-neon-lime px-2 py-0.5 text-[10px] text-neon-lime"
                >
                  {seat.ready ? "解除" : "準備"}
                </button>
              )}
              {(isHost || mine || seat.isCpu) && (
                <button
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_SEAT",
                      seatId: seat.id,
                      byClientId: clientId,
                    })
                  }
                  className="rounded border border-neon-red px-2 py-0.5 text-[10px] text-neon-red"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        {!mySeat && (
          <button
            onClick={() =>
              dispatch({
                type: "JOIN",
                clientId,
                seatId: uuid(),
                name: "プレイヤー",
              })
            }
            className="flex-1 rounded border-2 border-neon-cyan px-3 py-2 text-sm text-neon-cyan"
          >
            着席する
          </button>
        )}
        <button
          disabled={state.seats.length >= MAX_SEATS}
          onClick={() => dispatch({ type: "ADD_CPU", seatId: uuid() })}
          className="flex-1 rounded border-2 border-neon-violet px-3 py-2 text-sm text-neon-violet disabled:border-grid disabled:text-slate-600"
        >
          CPUを追加
        </button>
      </div>

      {isHost ? (
        <button
          disabled={!startable}
          onClick={() => dispatch({ type: "START", byClientId: clientId })}
          className="rounded border-2 border-neon-lime bg-neon-lime/10 px-4 py-3 text-base font-bold text-neon-lime transition enabled:hover:bg-neon-lime/20 enabled:active:scale-95 disabled:cursor-not-allowed disabled:border-grid disabled:text-slate-600"
        >
          {startable ? "ゲーム開始" : "全員の準備を待っています"}
        </button>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          ホストの開始を待っています…
        </p>
      )}
    </main>
  );
}
