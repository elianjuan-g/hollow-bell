// HOLLOW BELL — seals.js
// Seals are the goal of every chamber: faceted crystals that only a
// standing wave can shatter. A seal records every ring front that
// arrives at it; when fronts from enough distinct sources arrive within
// the crossing window, it shatters. A single arrival only cracks it —
// the white-hot lines that tell the player "you were close".

import { distance, recordArrival, distinctArrivals, frontCrossed } from './rings.js';

// A seal: { x, y, r, kind, required, baseX, baseY, drift, phase,
//            arrivals:[], cracks, shattered, shatterT, lastDeviationMs,
//            dampened }.
// kind is 'still' (fixed), 'drift' (slowly circles its anchor) or
// 'triple' (needs three sources to cross, not two).
export function createSeal(x, y, opts = {}) {
  const kind = opts.kind || 'still';
  return {
    x,
    y,
    baseX: x,
    baseY: y,
    r: opts.r || 20,
    kind,
    required: kind === 'triple' ? 3 : 2,
    drift: opts.drift || null, // { radius, speed, phase }
    phase: opts.phase || 0,
    arrivals: [],
    cracks: 0,
    shattered: false,
    shatterT: 0,
    lastDeviationMs: null,
    dampened: false,
  };
}

// The timing deviation of the seal's last two arrivals, in
// milliseconds — how far apart the two fronts arrived. A lone arrival
// (fewer than two) returns the full window: the seal is still waiting
// for its partner. This is the number the fissure readout and the
// wave trace show; it is real timing data, not a label.
export function sealDeviationMs(seal, window) {
  const a = seal.arrivals;
  if (a.length < 2) return Math.round(window * 1000);
  return Math.round(Math.abs(a[a.length - 1].t - a[a.length - 2].t) * 1000);
}

// Drifters circle their anchor point; still seals never move.
export function updateSeals(seals, dt, t) {
  for (const seal of seals) {
    if (seal.shattered || !seal.drift) continue;
    const a = seal.drift.phase + t * seal.drift.speed;
    seal.x = seal.baseX + Math.cos(a) * seal.drift.radius;
    seal.y = seal.baseY + Math.sin(a) * seal.drift.radius;
  }
}

// Check every live ring against every unshattered seal. When a ring front
// crosses a seal, record the arrival; when enough distinct sources have
// arrived within the window, the seal shatters and this returns its
// shatter events [{ seal, x, y }]. A lone arrival cracks the crystal
// instead (cracks cap at 3) and returns a crack event for the sound.
export function checkSealCrossings(seals, rings, now, window, isDamped = null) {
  const shattered = [];
  const cracked = [];
  for (const seal of seals) {
    if (seal.shattered) continue;
    let arrived = false;
    for (const ring of rings) {
      if (ring.dead || ring.hitSeals.has(seal)) continue;
      const d = distance(ring.x, ring.y, seal.x, seal.y);
      if (frontCrossed(ring, d)) {
        // A damped seal swallows the arrival: the front passes, the
        // seal does not crack, and the player must strike again once
        // the Cantor's arm has turned away.
        if (isDamped && isDamped(seal)) continue;
        ring.hitSeals.add(seal);
        recordArrival(seal, ring, now, window);
        arrived = true;
      }
    }
    if (!arrived) continue;
    if (distinctArrivals(seal, now, window) >= seal.required) {
      seal.shattered = true;
      seal.shatterT = now;
      seal.lastDeviationMs = sealDeviationMs(seal, window);
      shattered.push(seal);
    } else if (seal.cracks < 3) {
      seal.cracks += 1;
      seal.lastDeviationMs = sealDeviationMs(seal, window);
      cracked.push(seal);
    }
  }
  return { shattered, cracked };
}

export function sealsRemaining(seals) {
  return seals.filter((s) => !s.shattered).length;
}

export function allSealsShattered(seals) {
  return seals.length > 0 && seals.every((s) => s.shattered);
}
