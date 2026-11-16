// HOLLOW BELL — rng.js
// A small seeded random generator (mulberry32) so chambers and screenshot
// scenes are deterministic: the same seed always draws the same chamber,
// which is what makes the ?shot= screenshots reproducible.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A convenience wrapper around mulberry32 with the helpers the game uses.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // A float in [min, max).
    range(min, max) {
      return min + (max - min) * next();
    },
    // An integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of an array, uniformly.
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
  };
}
