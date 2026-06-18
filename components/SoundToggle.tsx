"use client";

import { useEffect, useState } from "react";
import { isSfxEnabled, playSfx, setSfxEnabled } from "@/lib/sfx";
import { Button } from "./Button";

// Mute toggle for the synthesized sound effects (persisted in localStorage).
export function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(isSfxEnabled());
  }, []);

  return (
    <Button
      variant={on ? "cyan" : "violet"}
      size="sm"
      onClick={() => {
        const next = !on;
        setSfxEnabled(next);
        setOn(next);
        if (next) playSfx("select");
      }}
      aria-label={on ? "効果音オン" : "効果音オフ"}
    >
      {on ? "♪ ON" : "♪ OFF"}
    </Button>
  );
}
