/**
 * Seeded deterministic RNG (LCG).
 *
 * `(seed * 9301 + 49297) % 233280` — classic Park-Miller-style linear
 * congruential generator. Same seed → same stream forever. Used so the same
 * `company.json` always produces the same dataset across reloads.
 */
export function makeRng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Stable string → numeric hash. Used to derive a per-entity seed from a key. */
export function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

export function randFloat(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function jitter(rng: () => number, amount: number): number {
  return (rng() * 2 - 1) * amount;
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function pickWeighted<T>(
  rng: () => number,
  items: ReadonlyArray<{ value: T; weight: number }>
): T {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

/**
 * Bounded random walk. Used for SERP rank histories and citation trends — same
 * shape the original hand-tuned data used.
 */
export function randWalk(
  start: number,
  days: number,
  seed: number,
  volatility = 1.2,
  bounds: [number, number] = [1, 100]
): number[] {
  const rng = makeRng(seed);
  const out: number[] = [];
  let x = start;
  for (let i = 0; i < days; i++) {
    const r = rng() * 2 - 1;
    x = Math.max(bounds[0], Math.min(bounds[1], x + r * volatility));
    out.push(Math.round(x * 10) / 10);
  }
  return out;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
