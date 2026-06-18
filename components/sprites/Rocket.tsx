import React from "react";

export interface RocketProps {
  size?: number;
}

interface Cell {
  x: number;
  y: number;
  c: string;
}

const C = {
  nose: "#ff5a6e", // red nose cone
  body: "#d7dde6", // light grey hull
  bodyShade: "#9aa3b0", // hull shadow
  window: "#39e0ff", // cyan porthole
  windowFrame: "#173a99",
  fin: "#ff4fd8", // magenta fins
  flameGold: "#ffd75a",
  flameLime: "#9dff5a",
} as const;

// 16x16 grid, rocket pointing up.
const CELLS: Cell[] = [
  // nose cone
  { x: 7, y: 1, c: C.nose },
  { x: 8, y: 1, c: C.nose },
  { x: 6, y: 2, c: C.nose },
  { x: 7, y: 2, c: C.nose },
  { x: 8, y: 2, c: C.nose },
  { x: 9, y: 2, c: C.nose },
  // upper body
  { x: 6, y: 3, c: C.body },
  { x: 7, y: 3, c: C.body },
  { x: 8, y: 3, c: C.bodyShade },
  { x: 9, y: 3, c: C.bodyShade },
  // window frame + glass
  { x: 6, y: 4, c: C.windowFrame },
  { x: 7, y: 4, c: C.window },
  { x: 8, y: 4, c: C.window },
  { x: 9, y: 4, c: C.windowFrame },
  { x: 6, y: 5, c: C.windowFrame },
  { x: 7, y: 5, c: C.window },
  { x: 8, y: 5, c: C.window },
  { x: 9, y: 5, c: C.windowFrame },
  // mid body
  { x: 6, y: 6, c: C.body },
  { x: 7, y: 6, c: C.body },
  { x: 8, y: 6, c: C.bodyShade },
  { x: 9, y: 6, c: C.bodyShade },
  { x: 6, y: 7, c: C.body },
  { x: 7, y: 7, c: C.body },
  { x: 8, y: 7, c: C.bodyShade },
  { x: 9, y: 7, c: C.bodyShade },
  { x: 6, y: 8, c: C.body },
  { x: 7, y: 8, c: C.body },
  { x: 8, y: 8, c: C.bodyShade },
  { x: 9, y: 8, c: C.bodyShade },
  // lower body
  { x: 6, y: 9, c: C.body },
  { x: 7, y: 9, c: C.body },
  { x: 8, y: 9, c: C.bodyShade },
  { x: 9, y: 9, c: C.bodyShade },
  // fins
  { x: 4, y: 9, c: C.fin },
  { x: 5, y: 9, c: C.fin },
  { x: 10, y: 9, c: C.fin },
  { x: 11, y: 9, c: C.fin },
  { x: 4, y: 10, c: C.fin },
  { x: 5, y: 10, c: C.fin },
  { x: 6, y: 10, c: C.body },
  { x: 7, y: 10, c: C.body },
  { x: 8, y: 10, c: C.bodyShade },
  { x: 9, y: 10, c: C.bodyShade },
  { x: 10, y: 10, c: C.fin },
  { x: 11, y: 10, c: C.fin },
  // nozzle
  { x: 6, y: 11, c: C.bodyShade },
  { x: 7, y: 11, c: C.body },
  { x: 8, y: 11, c: C.bodyShade },
  { x: 9, y: 11, c: C.bodyShade },
  // flame
  { x: 7, y: 12, c: C.flameGold },
  { x: 8, y: 12, c: C.flameGold },
  { x: 6, y: 13, c: C.flameGold },
  { x: 7, y: 13, c: C.flameLime },
  { x: 8, y: 13, c: C.flameLime },
  { x: 9, y: 13, c: C.flameGold },
  { x: 7, y: 14, c: C.flameGold },
  { x: 8, y: 14, c: C.flameGold },
];

export function Rocket({ size = 32 }: RocketProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label="rocket"
    >
      {CELLS.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
    </svg>
  );
}

export default Rocket;
