import React from "react";

export type PlanetKind = "earth" | "moon" | "mars";

export interface PlanetProps {
  kind: PlanetKind;
  size?: number;
}

interface Cell {
  x: number;
  y: number;
  c: string;
}

// 16x16 pixel grid. A simple readable circle mask is used as the planet body,
// then a few surface-detail cells are overlaid per kind.

// Circle disc rows: for each y, the [startX, endX] (inclusive) range of body pixels.
const DISC_ROWS: ReadonlyArray<readonly [number, number]> = [
  [5, 10], // y0
  [3, 12], // y1
  [2, 13], // y2
  [1, 14], // y3
  [1, 14], // y4
  [0, 15], // y5
  [0, 15], // y6
  [0, 15], // y7
  [0, 15], // y8
  [0, 15], // y9
  [1, 14], // y10
  [1, 14], // y11
  [2, 13], // y12
  [3, 12], // y13
  [5, 10], // y14
];

function discCells(base: string): Cell[] {
  const cells: Cell[] = [];
  DISC_ROWS.forEach((range, y) => {
    const [start, end] = range;
    for (let x = start; x <= end; x++) {
      cells.push({ x, y, c: base });
    }
  });
  return cells;
}

const PALETTE = {
  earthBlue: "#2b6bff",
  earthDeep: "#173a99",
  earthGreen: "#9dff5a",
  earthGreenDeep: "#4fb02e",
  moonGrey: "#9aa3b0",
  moonDeep: "#6b7280",
  moonCrater: "#5a626e",
  marsRed: "#ff5a3c",
  marsOrange: "#ffd75a",
  marsDeep: "#a83218",
  shine: "#ffffff",
} as const;

function bodyColor(kind: PlanetKind): string {
  if (kind === "earth") return PALETTE.earthBlue;
  if (kind === "moon") return PALETTE.moonGrey;
  return PALETTE.marsRed;
}

function detailCells(kind: PlanetKind): Cell[] {
  if (kind === "earth") {
    const g = PALETTE.earthGreen;
    const gd = PALETTE.earthGreenDeep;
    const d = PALETTE.earthDeep;
    return [
      // landmass top-left
      { x: 3, y: 3, c: g },
      { x: 4, y: 3, c: g },
      { x: 3, y: 4, c: gd },
      { x: 4, y: 4, c: g },
      { x: 5, y: 4, c: g },
      { x: 4, y: 5, c: gd },
      // landmass bottom-right
      { x: 9, y: 9, c: g },
      { x: 10, y: 9, c: g },
      { x: 10, y: 10, c: g },
      { x: 11, y: 10, c: gd },
      { x: 9, y: 10, c: gd },
      { x: 10, y: 11, c: g },
      // deep ocean shadow
      { x: 12, y: 6, c: d },
      { x: 12, y: 7, c: d },
    ];
  }
  if (kind === "moon") {
    const cr = PALETTE.moonCrater;
    const dp = PALETTE.moonDeep;
    return [
      { x: 4, y: 4, c: cr },
      { x: 5, y: 4, c: cr },
      { x: 4, y: 5, c: dp },
      { x: 5, y: 5, c: cr },
      { x: 9, y: 6, c: cr },
      { x: 10, y: 6, c: dp },
      { x: 9, y: 7, c: cr },
      { x: 6, y: 10, c: cr },
      { x: 7, y: 10, c: dp },
      { x: 7, y: 11, c: cr },
      { x: 11, y: 11, c: cr },
    ];
  }
  // mars
  const o = PALETTE.marsOrange;
  const dp = PALETTE.marsDeep;
  return [
    { x: 3, y: 5, c: dp },
    { x: 4, y: 5, c: dp },
    { x: 4, y: 6, c: dp },
    { x: 10, y: 4, c: o },
    { x: 11, y: 4, c: o },
    { x: 10, y: 5, c: o },
    { x: 8, y: 9, c: dp },
    { x: 9, y: 9, c: dp },
    { x: 9, y: 10, c: dp },
    { x: 5, y: 11, c: o },
    { x: 6, y: 11, c: o },
  ];
}

export function Planet({ kind, size = 32 }: PlanetProps) {
  const body = discCells(bodyColor(kind));
  const details = detailCells(kind);
  // subtle top-left shine highlight common to all kinds
  const shine: Cell[] = [
    { x: 2, y: 2, c: PALETTE.shine },
    { x: 3, y: 2, c: PALETTE.shine },
    { x: 2, y: 3, c: PALETTE.shine },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${kind} planet`}
    >
      {body.map((c, i) => (
        <rect key={`b${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
      {details.map((c, i) => (
        <rect key={`d${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
      {shine.map((c, i) => (
        <rect
          key={`s${i}`}
          x={c.x}
          y={c.y}
          width={1}
          height={1}
          fill={c.c}
          opacity={0.5}
        />
      ))}
    </svg>
  );
}

export default Planet;
