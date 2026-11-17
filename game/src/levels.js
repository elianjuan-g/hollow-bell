// HOLLOW BELL — levels.js
// The eight chambers of a run, then the endless procedural mode. Each
// chamber is a small puzzle: where the seals sit, what stands in the
// way, how many bells and charges the player gets, and how tight the
// crossing window is. Chambers 1-6 teach one mechanic each; 7-8 are
// the exam. Chamber 8 holds the Silent Cantor: three mute seals ringed
// by its dampener arms. Past 8 the game draws new chambers from the
// seed, with the window shrinking. Chamber names come from
// CARILLON_CHAMBERS_SPEC (config.js), the single source of identity.

import { FLOOR, CROSS_WINDOW, CARILLON_CHAMBERS_SPEC } from './config.js';

// Hand-placed chambers. A seal entry is { x, y, kind, drift } where
// kind is 'still', 'drift' or 'triple' and drift is { radius, speed,
// phase } for drifters. A pillar is { x, y, r }. mutes is
// { total, interval, speed } — total Mutes that crawl in over the
// chamber, one every `interval` seconds. A chamber with `cantor: true`
// wakes the Silent Cantor at its centre.
const CHAMBERS = [
  {
    name: CARILLON_CHAMBERS_SPEC[0].name,
    hint: 'Place two bells. Strike both. Cross the rings on the seal.',
    bells: 2, charges: 10, window: 0.25, parTime: 30,
    seals: [{ x: 480, y: 320, kind: 'still' }],
    pillars: [], conductor: null, cantor: false,
    mutes: { total: 0, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[1].name,
    hint: 'One seal wanders. Time your strikes for where it will be.',
    bells: 2, charges: 10, window: 0.25, parTime: 35,
    seals: [
      { x: 300, y: 220, kind: 'still' },
      { x: 660, y: 420, kind: 'drift', drift: { radius: 60, speed: 0.25, phase: 0 } },
    ],
    pillars: [], conductor: null, cantor: false,
    mutes: { total: 0, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[2].name,
    hint: 'The pillar reflects a ring into a second front. One bell can cross with itself.',
    bells: 2, charges: 10, window: 0.25, parTime: 40,
    seals: [
      { x: 300, y: 200, kind: 'still' },
      { x: 660, y: 440, kind: 'still' },
    ],
    pillars: [{ x: 480, y: 320, r: 18 }],
    conductor: null, cantor: false,
    mutes: { total: 0, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[3].name,
    hint: 'Mutes crawl toward your bells. One ring stuns them; a crossing kills them.',
    bells: 3, charges: 10, window: 0.25, parTime: 45,
    seals: [
      { x: 320, y: 200, kind: 'still' },
      { x: 640, y: 440, kind: 'still' },
    ],
    pillars: [], conductor: null, cantor: false,
    mutes: { total: 2, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[4].name,
    hint: 'The heart seal needs THREE fronts at once. Place all three bells.',
    bells: 3, charges: 12, window: 0.25, parTime: 50,
    seals: [
      { x: 280, y: 200, kind: 'still' },
      { x: 680, y: 440, kind: 'still' },
      { x: 480, y: 320, kind: 'triple' },
    ],
    pillars: [], conductor: null, cantor: false,
    mutes: { total: 0, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[5].name,
    hint: 'Its aura slows every ring that passes through it. Strike from outside the circle.',
    bells: 3, charges: 12, window: 0.25, parTime: 50,
    seals: [
      { x: 300, y: 200, kind: 'still' },
      { x: 660, y: 440, kind: 'still' },
    ],
    pillars: [], conductor: { x: 480, y: 320, auraR: 130 }, cantor: false,
    mutes: { total: 0, interval: 14, speed: 18 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[6].name,
    hint: 'Two seals wander and the window tightens. Pillars and hunger together.',
    bells: 3, charges: 12, window: 0.22, parTime: 55,
    seals: [
      { x: 280, y: 180, kind: 'still' },
      { x: 680, y: 460, kind: 'still' },
      { x: 480, y: 320, kind: 'drift', drift: { radius: 55, speed: 0.35, phase: 1.0 } },
    ],
    pillars: [
      { x: 480, y: 180, r: 16 },
      { x: 480, y: 460, r: 16 },
    ],
    conductor: null, cantor: false,
    mutes: { total: 3, interval: 12, speed: 20 },
  },
  {
    name: CARILLON_CHAMBERS_SPEC[7].name,
    hint: 'Three mute seals, ringed by the Cantor’s dampener arms. Strike only when the arms turn away.',
    bells: 3, charges: 12, window: 0.20, parTime: 70,
    seals: [
      { x: 280, y: 200, kind: 'still' },
      { x: 680, y: 200, kind: 'still' },
      { x: 480, y: 460, kind: 'triple' },
    ],
    pillars: [
      { x: 480, y: 180, r: 16 },
      { x: 180, y: 320, r: 16 },
    ],
    conductor: null, cantor: true,
    mutes: { total: 3, interval: 10, speed: 22 },
  },
];

// A point on the floor, kept clear of the edges and of the other points.
function scatterPoint(rng, taken, margin = 90) {
  for (let tries = 0; tries < 40; tries++) {
    const x = rng.range(FLOOR.x + 70, FLOOR.x + FLOOR.w - 70);
    const y = rng.range(FLOOR.y + 70, FLOOR.y + FLOOR.h - 70);
    if (taken.every((p) => Math.hypot(p.x - x, p.y - y) > margin)) {
      return { x, y };
    }
  }
  return { x: rng.range(FLOOR.x + 90, FLOOR.x + FLOOR.w - 90), y: rng.range(FLOOR.y + 90, FLOOR.y + FLOOR.h - 90) };
}

// Chambers past 8 are drawn from the seed: 3-5 seals (some drifting,
// some triple), 0-2 pillars, sometimes a Conductor, Mutes without end,
// and a window that keeps shrinking to a 0.12s floor.
function endlessChamber(n, rng) {
  const taken = [];
  const sealCount = rng.int(3, 5);
  const seals = [];
  for (let i = 0; i < sealCount; i++) {
    const p = scatterPoint(rng, taken);
    taken.push(p);
    const roll = rng.next();
    const kind = roll < 0.25 ? 'triple' : roll < 0.55 ? 'drift' : 'still';
    const seal = { x: p.x, y: p.y, kind };
    if (kind === 'drift') {
      seal.drift = { radius: rng.range(35, 65), speed: rng.range(0.25, 0.45), phase: rng.range(0, 6.28) };
    }
    seals.push(seal);
  }
  const pillars = [];
  const pillarCount = rng.int(0, 2);
  for (let i = 0; i < pillarCount; i++) {
    const p = scatterPoint(rng, taken);
    taken.push(p);
    pillars.push({ x: p.x, y: p.y, r: 16 });
  }
  const conductor = rng.next() < 0.5
    ? { x: 480, y: 320, auraR: rng.range(100, 140) }
    : null;
  return {
    name: `ENDLESS ${n - 8}`,
    hint: 'The deep chambers do not end. How far can the bell carry you?',
    bells: 3,
    charges: 12,
    window: Math.max(0.12, CROSS_WINDOW - 0.01 * (n - 1)),
    parTime: 70,
    seals,
    pillars,
    conductor,
    cantor: false,
    mutes: { total: Infinity, interval: 10, speed: 22 + Math.min(8, n - 8) },
  };
}

// Build chamber n (1-based). rng is only used past chamber 8.
export function buildChamber(n, rng) {
  const def = n <= CHAMBERS.length ? CHAMBERS[n - 1] : endlessChamber(n, rng);
  return { n, ...def };
}

export const CHAMBER_COUNT = CHAMBERS.length;
