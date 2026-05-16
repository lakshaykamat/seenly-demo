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

/**
 * Step walk — real SERP/citation series are choppy: long flat stretches
 * punctuated by sharp moves (algorithm updates, content ships, links land).
 * `jumpChance` is the per-day probability of a discrete shift; `jumpScale` is
 * its magnitude. Tiny tick noise fills the flat days so charts don't look
 * dead.
 */
export function stepWalk(
  start: number,
  days: number,
  seed: number,
  opts: {
    jumpChance?: number;
    jumpScale?: number;
    tickNoise?: number;
    bounds?: [number, number];
    drift?: number;
  } = {}
): number[] {
  const {
    jumpChance = 0.18,
    jumpScale = 4.5,
    tickNoise = 0.35,
    bounds = [1, 100],
    drift = 0,
  } = opts;
  const rng = makeRng(seed);
  const out: number[] = [];
  let x = start;
  for (let i = 0; i < days; i++) {
    if (rng() < jumpChance) {
      x += (rng() * 2 - 1) * jumpScale;
    }
    x += (rng() * 2 - 1) * tickNoise + drift;
    x = Math.max(bounds[0], Math.min(bounds[1], x));
    out.push(Math.round(x * 10) / 10);
  }
  return out;
}

/**
 * Approximate gaussian via 12-sum CLT. Mean `mu`, stddev `sigma`. Used for
 * scores, confidence, and other quantities that cluster around a center in
 * real data rather than uniformly spreading.
 */
export function gaussian(rng: () => number, mu: number, sigma: number): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += rng();
  return mu + (s - 6) * sigma;
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
