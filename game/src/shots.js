// HOLLOW BELL — shots.js
// Deterministic scenes for screenshots: ?shot=title, ?shot=play,
// ?shot=result or ?shot=gameover (with &seed=N). A shot scene stages
// the game into the exact frame the screenshot needs, then freezes the
// loop so the render is stable. This is how the entry's screenshots
// are taken — the same game, the same code, a chosen moment.

import { makeRng } from './rng.js';
import { buildChamber } from './levels.js';
import { createSeal } from './seals.js';
import { createMute } from './mutes.js';
import { strikeRing } from './rings.js';

export function parseShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || null,
    seed: Number(q.get('seed') || '1') || 1,
  };
}

// Stage the title: two bells placed, both struck a moment ago, their
// rings mid-intersection behind the title text.
function stageTitle(state, rng) {
  state.screen = 'title';
  state.chamber = 1;
  const def = buildChamber(1, rng);
  state.chamberName = def.name;
  state.seals = def.seals.map((s) => createSeal(s.x, s.y, s));
  state.bells = [
    { id: 1, x: 300, y: 320, lastStrike: state.time - 0.1 },
    { id: 2, x: 660, y: 320, lastStrike: state.time - 0.1 },
  ];
  strikeRing(state.rings, 300, 320, '1');
  strikeRing(state.rings, 660, 320, '2');
  // Advance the rings so they meet near the centre seal.
  for (let i = 0; i < 45; i++) {
    for (const ring of state.rings) ring.radius += 260 * (1 / 60);
  }
  state.flares = [{ x: 480, y: 320, life: 0.9 }];
}

// Stage gameplay: chamber 4's shape (seals, a Mute closing in), two
// bells struck so their fronts are crossing on a cracking crystal.
function stagePlay(state, rng) {
  state.screen = 'playing';
  state.chamber = 4;
  const def = buildChamber(4, rng);
  state.chamberName = def.name;
  state.hint = def.hint;
  state.maxBells = def.bells;
  state.maxCharges = def.charges;
  state.charges = 7;
  state.score = 1250;
  state.breaths = 3;
  state.seals = def.seals.map((s) => createSeal(s.x, s.y, s));
  state.seals[0].cracks = 2;
  state.pillars = def.pillars;
  state.conductor = def.conductor;
  state.bells = [
    { id: 1, x: 250, y: 380, lastStrike: state.time - 0.05 },
    { id: 2, x: 620, y: 180, lastStrike: state.time - 0.05 },
    { id: 3, x: 700, y: 480, lastStrike: -10 },
  ];
  strikeRing(state.rings, 250, 380, '1');
  strikeRing(state.rings, 620, 180, '2');
  // Step the rings forward until their fronts are at the first seal.
  const target = state.seals[0];
  for (let step = 0; step < 120; step++) {
    let done = false;
    for (const ring of state.rings) {
      ring.radius += 260 * (1 / 60);
      if (Math.abs(ring.radius - Math.hypot(ring.x - target.x, ring.y - target.y)) < 4) done = true;
    }
    if (done) break;
  }
  state.flares = [{ x: target.x, y: target.y, life: 0.85 }];
  // A Mute closing on the third bell, and a second one mid-floor.
  state.mutes = [
    createMute(760, 430, 18),
    createMute(120, 140, 18),
  ];
  state.particles = [];
  for (let i = 0; i < 26; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = rng.next() * 46;
    state.particles.push({
      x: target.x + Math.cos(a) * d,
      y: target.y + Math.sin(a) * d,
      vx: 0, vy: 0,
      life: rng.range(0.4, 1), maxLife: 1,
      color: 'rgba(255, 243, 214, A)',
      size: rng.range(1, 2.6),
    });
  }
}

// Stage the result card: chamber 4 cleared, with a score breakdown.
function stageResult(state) {
  state.screen = 'result';
  state.score = 2140;
  state.result = {
    chamber: 4,
    sealsBroken: 2,
    chargeBonus: 175,
    timeBonus: 120,
    score: 2140,
  };
}

// Stage the game-over screen.
function stageGameOver(state) {
  state.screen = 'gameover';
  state.score = 3420;
  state.chambersCleared = 6;
  state.sealsBrokenTotal = 14;
}

// Stage one of the named scenes into `state` and freeze the loop.
// Returns true when a scene was staged.
export function stageShot(state, shot, seed) {
  const rng = makeRng(seed);
  if (shot === 'title') stageTitle(state, rng);
  else if (shot === 'play') stagePlay(state, rng);
  else if (shot === 'result') stageResult(state);
  else if (shot === 'gameover') stageGameOver(state);
  else return false;
  state.frozen = true;
  return true;
}
