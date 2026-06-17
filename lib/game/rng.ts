// Deterministic RNG so that the host can replay/validate state and every
// client computes identical results from the same seed.

/** mulberry32 — small, fast, seedable PRNG. Returns the next [state, value]. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return [t | 0, value];
}

/** Hash an arbitrary string seed into a 32-bit integer RNG state. */
export function seedFromString(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) | 0;
}

/** Roll an integer in [min, max] inclusive. Returns [newState, roll]. */
export function rollInt(
  state: number,
  min: number,
  max: number,
): [number, number] {
  const [next, value] = nextRandom(state);
  const roll = min + Math.floor(value * (max - min + 1));
  return [next, roll];
}

/** Pick a random element. Returns [newState, item]. */
export function pick<T>(state: number, items: readonly T[]): [number, T] {
  const [next, idx] = rollInt(state, 0, items.length - 1);
  return [next, items[idx]];
}
