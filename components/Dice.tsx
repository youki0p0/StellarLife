"use client";

import { useEffect, useState } from "react";
import { playSfx } from "@/lib/sfx";
import { Button } from "./Button";

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
      <Button
        variant="lime"
        size="md"
        onClick={() => {
          playSfx("roll");
          onRoll();
        }}
        disabled={!canRoll}
      >
        {label}
      </Button>
    </div>
  );
}
