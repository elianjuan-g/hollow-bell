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
import { createCantor } from './cantor.js';

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

// Stage gameplay: chamber 3, VERDIGRIS NAVE (the pillar chamber),
// two bells struck so their fronts are crossing on a cracking seal,
// the chain at x4. The caption line is the shot's own HUD.
function stagePlay(state, rng) {
  state.screen = 'playing';
  state.chamber = 3;
  const def = buildChamber(3, rng);
  state.chamberName = def.name;
  state.hint = def.hint;
  state.maxBells = def.bells;
  state.maxCharges = def.charges;
  state.charges = 7;
  state.score = 1250;
  state.breaths = 3;
  state.chain = 4;
  state.shotCaption = 'CHAMBER III: VERDIGRIS NAVE - HARMONIC CHAIN x4 - RESONANCE INTEGRITY 92%';
  state.seals = def.seals.map((s) => createSeal(s.x, s.y, s));
  state.seals[0].cracks = 2;
  state.seals[0].lastDeviationMs = 87;
  state.pillars = def.pillars;
  state.conductor = def.conductor;
  state.bells = [
    { id: 1, x: 250, y: 380, lastStrike: state.time - 0.05 },
    { id: 2, x: 620, y: 180, lastStrike: state.time - 0.05 },
    { id: 3, x: 700, y: 480, lastStrike: state.time - 0.05 },
  ];
  strikeRing(state.rings, 250, 380, '1');
  strikeRing(state.rings, 620, 180, '2');
  // Step the rings forward until BOTH fronts sit on the first seal.
  // A ring that reaches the seal HOLDS there while the slower ring
  // catches up — the frozen frame shows the exact crossing moment
  // (two fronts on one seal), not one ring early and one late.
  const target = state.seals[0];
  const targetD = state.rings.map((ring) => Math.hypot(ring.x - target.x, ring.y - target.y));
  for (let step = 0; step < 140; step++) {
    let allHeld = true;
    state.rings.forEach((ring, i) => {
      if (Math.abs(ring.radius - targetD[i]) < 4) {
        ring.radius = targetD[i];
      } else {
        ring.radius += 260 * (1 / 60);
        allHeld = false;
      }
    });
    if (allHeld) break;
  }
  // Bell 3 struck a moment later: its ring is mid-flight toward the
  // second seal, a third circle filling the lower-right of the frame.
  const ring3 = strikeRing(state.rings, 700, 480, '3');
  for (let i = 0; i < 26; i++) ring3.radius += 260 * (1 / 60);
  // Ring 2 passed the pillar on its way to the seal, so the reflected
  // front ("2r") is expanding from the pillar — one bell crossing
  // with itself, the shot's second story.
  const ringR = strikeRing(state.rings, 480, 320, '2r');
  for (let i = 0; i < 28; i++) ringR.radius += 260 * (1 / 60);
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
  // The wave trace: six recent arrivals, mixed precision.
  state.waveTrace = [120, 45, 210, 30, 90, 12].map((dev, i) => ({
    t: state.time - (6 - i) * 1.6,
    dev,
  }));
}

// Stage the boss climax: chamber 8, THE SILENT CANTOR. Two of the
// three mute seals are already shattered; the third (triple) is
// cracked and the rings are flying for it while the Cantor's arms
// turn — the target seal's sector is open.
function stageBoss(state, rng) {
  state.screen = 'playing';
  state.chamber = 8;
  const def = buildChamber(8, rng);
  state.chamberName = def.name;
  state.hint = def.hint;
  state.maxBells = def.bells;
  state.maxCharges = def.charges;
  state.charges = 5;
  state.score = 3420;
  state.breaths = 2;
  state.chain = 3;
  state.shotCaption = 'CHAMBER VIII: THE SILENT CANTOR - DAMPENER PHASE ACTIVE - SHATTER THE MUTE SEALS (2/3)';
  state.seals = def.seals.map((s) => createSeal(s.x, s.y, s));
  state.seals[0].shattered = true;
  state.seals[1].shattered = true;
  state.seals[2].cracks = 2;
  state.seals[2].lastDeviationMs = 42;
  state.pillars = def.pillars;
  state.conductor = def.conductor;
  state.cantor = createCantor(480, 320);
  state.cantor.angle = 0.3;
  state.bells = [
    { id: 1, x: 250, y: 380, lastStrike: state.time - 0.05 },
    { id: 2, x: 620, y: 180, lastStrike: state.time - 0.05 },
    { id: 3, x: 700, y: 480, lastStrike: -10 },
  ];
  strikeRing(state.rings, 250, 380, '1');
  strikeRing(state.rings, 620, 180, '2');
  // Step the rings forward until their fronts are at the last seal.
  const target = state.seals[2];
  for (let step = 0; step < 140; step++) {
    let done = false;
    for (const ring of state.rings) {
      ring.radius += 260 * (1 / 60);
      if (Math.abs(ring.radius - Math.hypot(ring.x - target.x, ring.y - target.y)) < 4) done = true;
    }
    if (done) break;
  }
  state.flares = [{ x: target.x, y: target.y, life: 0.85 }];
  state.mutes = [
    createMute(760, 430, 18),
    createMute(120, 140, 18),
  ];
  state.particles = [];
  for (let i = 0; i < 30; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = rng.next() * 52;
    state.particles.push({
      x: target.x + Math.cos(a) * d,
      y: target.y + Math.sin(a) * d,
      vx: 0, vy: 0,
      life: rng.range(0.4, 1), maxLife: 1,
      color: 'rgba(255, 154, 60, A)',
      size: rng.range(1, 2.6),
    });
  }
  state.waveTrace = [90, 38, 150, 22, 64, 18].map((dev, i) => ({
    t: state.time - (6 - i) * 1.6,
    dev,
  }));
}

// Stage the result card: the Mastery Ledger of chamber 8. The wave
// trace is tuned so its mean deviation reads exactly 1.8ms — the
// ledger computes the number from the trace, it is not typed in.
function stageResult(state) {
  state.screen = 'result';
  state.chamber = 8;
  state.chamberName = 'THE SILENT CANTOR';
  state.score = 54150;
  state.chambersCleared = 8;
  state.waveTrace = [2, 2, 2, 2, 1, 2, 2, 1, 2, 2].map((dev, i) => ({
    t: state.time - (10 - i) * 0.8,
    dev,
  }));
  state.result = {
    chamber: 8,
    sealsBroken: 14,
    chargeBonus: 175,
    timeBonus: 120,
    score: 54150,
    meanDeviationMs: 1.8,
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
  else if (shot === 'boss') stageBoss(state, rng);
  else if (shot === 'result') stageResult(state);
  else if (shot === 'gameover') stageGameOver(state);
  else return false;
  state.frozen = true;
  return true;
}
