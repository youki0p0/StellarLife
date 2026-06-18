"use client";

import { useEffect, useRef, useState } from "react";
import { describeDelta } from "@/lib/game/stats";
import type { EventFlash } from "@/lib/game/types";
import { playSfx } from "@/lib/sfx";
import { achievementLabel } from "@/lib/game/achievements";
import { ACCENT_BORDER, ACCENT_TEXT, type Accent } from "./ui";

// A transient popup that surfaces the most recent resolved event (personal,
// global, mission, accident) so players always see what happened — not just a
// log line. Non-blocking: it auto-dismisses and the turn flow never waits.

const TONE_ACCENT: Record<string, Accent> = {
  good: "lime",
  bad: "red",
  global: "magenta",
  info: "cyan",
};

export function EventFlashPopup({ flash }: { flash: EventFlash | null }) {
  const [shown, setShown] = useState<EventFlash | null>(null);
  const lastSeq = useRef(0);

  useEffect(() => {
    if (!flash || flash.seq === lastSeq.current) return;
    lastSeq.current = flash.seq;
    setShown(flash);
    playSfx(
      flash.tone === "good"
        ? "good"
        : flash.tone === "bad"
          ? "bad"
          : "event",
    );
    const t = setTimeout(() => setShown(null), 2800);
    return () => clearTimeout(t);
  }, [flash]);

  if (!shown) return null;
  const a = TONE_ACCENT[shown.tone ?? "info"] ?? "cyan";
  const deltaText = describeDelta(shown.delta);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4">
      <div
        key={shown.seq}
        className={`event-pop scanlines relative w-full max-w-sm overflow-hidden rounded-lg border-2 ${ACCENT_BORDER[a]} bg-panel/95 px-4 py-3 shadow-neon`}
      >
        <div className={`text-[10px] ${ACCENT_TEXT[a]}`}>
          {shown.scope === "global" ? "全体イベント" : `${shown.playerName} のイベント`}
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-100">{shown.title}</div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
          {shown.description}
        </p>
        {deltaText && (
          <div className={`mt-1 text-[11px] font-bold ${ACCENT_TEXT[a]}`}>
            {deltaText}
          </div>
        )}
        {shown.achievement && (
          <div className="mt-1 text-[10px] text-neon-violet">
            人生目標: {achievementLabel(shown.achievement)}
          </div>
        )}
      </div>
    </div>
  );
}
