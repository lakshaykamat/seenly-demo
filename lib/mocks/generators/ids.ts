import { makeRng, hash } from "./rng";

const HEX_CHARS = "0123456789abcdef";

/** Mint a deterministic id by hashing a stable namespace + key. */
export function id(prefix: string, key: string, length = 12): string {
  const seed = hash(`${prefix}:${key}`);
  const rng = makeRng(seed);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += HEX_CHARS[Math.floor(rng() * 16)];
  }
  return `${prefix}_${out}`;
}

/** Sequential id: `prefix_001`, `prefix_002`, ... — for ordered seed lists. */
export function seqId(prefix: string, index: number, pad = 3): string {
  return `${prefix}_${String(index).padStart(pad, "0")}`;
}

/** Hex-encoded id mint, padded — base36-style for shorter ids. */
export function shortId(prefix: string, key: string, length = 6): string {
  const seed = hash(`${prefix}:${key}`);
  const rng = makeRng(seed);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += HEX_CHARS[Math.floor(rng() * 16)];
  }
  return `${prefix}_${out}`;
}
