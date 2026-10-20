/**
 * A tiny seeded random number generator (mulberry32). The same seed always
 * produces the same sequence, so the demo data is identical on every server,
 * test run and deploy, with no Math.random() or Date.now() involved.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  return {
    /** Float in [0, 1). */
    next,
    /** Integer in [min, max], inclusive. */
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    /** Picks a key using relative weights, e.g. { successful: 80, failed: 20 }. */
    weighted<K extends string>(weights: Record<K, number>): K {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}
