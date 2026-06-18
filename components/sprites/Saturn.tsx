import React from "react";

export interface SaturnProps {
  size?: number;
}

interface Cell {
  x: number;
  y: number;
  c: string;
}

const C = {
  body: "#9b6bff", // violet planet
  bodyShade: "#6b3fcf", // darker band
  bodyBand: "#39e0ff", // cyan atmospheric band
  shine: "#ffffff",
  ring: "#ffd75a", // gold ring
  ringFade: "#9dff5a", // lime ring accent
} as const;

// 16x16 grid. Planet disc centered ~ (8,7) radius ~4, with a ring crossing
// horizontally through the lower-middle, drawn partly behind/in-front.

// Planet disc rows (y -> [start,end] inclusive)
const DISC_ROWS: ReadonlyArray<readonly [number, number]> = [
  [6, 9], // y3
  [5, 10], // y4
  [4, 11], // y5
  [4, 11], // y6
  [4, 11], // y7
  [4, 11], // y8
  [5, 10], // y9
  [6, 9], // y10
];
const DISC_Y0 = 3;

export function Saturn({ size = 32 }: SaturnProps) {
  const body: Cell[] = [];
  DISC_ROWS.forEach((range, i) => {
    const y = DISC_Y0 + i;
    const [start, end] = range;
    for (let x = start; x <= end; x++) {
      let c: string = C.body;
      // cyan band across the middle of the planet
      if (y === 7) c = C.bodyBand;
      // bottom shading
      if (y >= 9) c = C.bodyShade;
      body.push({ x, y, c });
    }
  });

  // top-left shine highlight
  const shine: Cell[] = [
    { x: 6, y: 4, c: C.shine },
    { x: 7, y: 4, c: C.shine },
    { x: 5, y: 5, c: C.shine },
  ];

  // ring: a flattened ellipse crossing behind the top and in front of the bottom.
  // Drawn as two arcs at the planet's "waist".
  const ring: Cell[] = [
    // left ring arm (in front, lower)
    { x: 0, y: 9, c: C.ring },
    { x: 1, y: 9, c: C.ring },
    { x: 1, y: 8, c: C.ringFade },
    { x: 2, y: 8, c: C.ring },
    { x: 3, y: 8, c: C.ring },
    { x: 3, y: 9, c: C.ring },
    // right ring arm (in front, lower)
    { x: 12, y: 8, c: C.ring },
    { x: 13, y: 8, c: C.ring },
    { x: 14, y: 8, c: C.ringFade },
    { x: 14, y: 9, c: C.ring },
    { x: 15, y: 9, c: C.ring },
    { x: 12, y: 9, c: C.ring },
    // ring crossing in front of planet bottom edge
    { x: 4, y: 9, c: C.ring },
    { x: 11, y: 9, c: C.ring },
  ];

  // back portion of the ring drawn first (behind the planet body)
  const ringBack: Cell[] = [
    { x: 4, y: 6, c: C.ringFade },
    { x: 11, y: 6, c: C.ringFade },
    { x: 3, y: 6, c: C.ring },
    { x: 12, y: 6, c: C.ring },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label="saturn"
    >
      {ringBack.map((c, i) => (
        <rect key={`rb${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
      {body.map((c, i) => (
        <rect key={`b${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
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
      {ring.map((c, i) => (
        <rect key={`r${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
    </svg>
  );
}

export default Saturn;
