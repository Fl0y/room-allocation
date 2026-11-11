// Generator pseudo-aleator determinist (mulberry32): același seed → aceeași secvență.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rnd: Rng, lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));

export const pick = <T>(rnd: Rng, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;

/** Alegere ponderată: `weights` nu trebuie să fie normalizate. */
export function weighted<T extends string | number>(rnd: Rng, weights: readonly (readonly [T, number])[]): T {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * total;
  for (const [value, w] of weights) {
    x -= w;
    if (x < 0) return value;
  }
  return weights[weights.length - 1]![0];
}
