"use client";

import { useEffect, useState } from "react";

const FACES = ["1", "2", "3", "4", "5", "6"];

export function Dice({
  value,
  canRoll,
  onRoll,
  label,
}: {
  value: number | null;
  canRoll: boolean;
  onRoll: () => void;
  label: string;
}) {
  const [spinning, setSpinning] = useState(false);

  // Brief spin animation whenever a new roll value arrives.
  useEffect(() => {
    if (value === null) return;
    setSpinning(true);
    const t = setTimeout(() => setSpinning(false), 500);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 border-neon-cyan bg-void text-2xl font-bold text-neon-cyan text-shadow-neon ${
          spinning ? "dice-rolling" : ""
        }`}
      >
        {value === null ? "·" : FACES[value - 1]}
      </div>
      <button
        onClick={onRoll}
        disabled={!canRoll}
        className="rounded border-2 border-neon-lime bg-neon-lime/10 px-6 py-2 text-sm font-bold text-neon-lime transition enabled:hover:bg-neon-lime/20 enabled:active:scale-95 disabled:cursor-not-allowed disabled:border-grid disabled:text-slate-600"
      >
        {label}
      </button>
    </div>
  );
}
