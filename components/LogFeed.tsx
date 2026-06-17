"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/game/types";

const TONE: Record<string, string> = {
  good: "text-neon-lime",
  bad: "text-neon-red",
  global: "text-neon-magenta",
  info: "text-slate-300",
};

export function LogFeed({ log }: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="h-32 overflow-y-auto rounded border border-grid bg-void/70 p-2 text-[10px] leading-relaxed">
      {log.map((entry) => (
        <div key={entry.id} className={TONE[entry.tone ?? "info"]}>
          {entry.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
