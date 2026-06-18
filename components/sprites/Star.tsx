import React from "react";

export interface StarProps {
  size?: number;
  color?: string;
}

interface Cell {
  x: number;
  y: number;
}

// 16x16 grid, 4-point sparkle centered at (7.5, 7.5).
const CELLS: Cell[] = [
  // vertical spike (top)
  { x: 7, y: 1 },
  { x: 8, y: 1 },
  { x: 7, y: 2 },
  { x: 8, y: 2 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
  { x: 7, y: 4 },
  { x: 8, y: 4 },
  // horizontal spike (left)
  { x: 1, y: 7 },
  { x: 1, y: 8 },
  { x: 2, y: 7 },
  { x: 2, y: 8 },
  { x: 3, y: 7 },
  { x: 3, y: 8 },
  { x: 4, y: 7 },
  { x: 4, y: 8 },
  // core
  { x: 5, y: 5 },
  { x: 6, y: 6 },
  { x: 5, y: 6 },
  { x: 6, y: 5 },
  { x: 9, y: 6 },
  { x: 10, y: 5 },
  { x: 9, y: 5 },
  { x: 10, y: 6 },
  { x: 6, y: 7 },
  { x: 7, y: 6 },
  { x: 6, y: 8 },
  { x: 7, y: 9 },
  { x: 8, y: 6 },
  { x: 9, y: 7 },
  { x: 8, y: 9 },
  { x: 9, y: 8 },
  // center block
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 7, y: 8 },
  { x: 8, y: 8 },
  // horizontal spike (right)
  { x: 11, y: 7 },
  { x: 11, y: 8 },
  { x: 12, y: 7 },
  { x: 12, y: 8 },
  { x: 13, y: 7 },
  { x: 13, y: 8 },
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  // vertical spike (bottom)
  { x: 7, y: 11 },
  { x: 8, y: 11 },
  { x: 7, y: 12 },
  { x: 8, y: 12 },
  { x: 7, y: 13 },
  { x: 8, y: 13 },
  { x: 7, y: 14 },
  { x: 8, y: 14 },
];

export function Star({ size = 32, color = "#ffd75a" }: StarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label="star"
    >
      {CELLS.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}

export default Star;
