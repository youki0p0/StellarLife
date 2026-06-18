"use client";

import { useEffect, useState } from "react";
import { isBgmEnabled, setBgmEnabled, startBgm } from "@/lib/bgm";
import { Button } from "./Button";

// Background-music toggle. BGM defaults to off and only starts on this user
// gesture (respecting browser autoplay policies).
export function BgmToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const enabled = isBgmEnabled();
    setOn(enabled);
    if (enabled) startBgm();
  }, []);

  return (
    <Button
      variant={on ? "magenta" : "violet"}
      size="sm"
      onClick={() => {
        const next = !on;
        setBgmEnabled(next);
        setOn(next);
      }}
      aria-label={on ? "BGMオン" : "BGMオフ"}
    >
      {on ? "♬ BGM" : "♬ OFF"}
    </Button>
  );
}
