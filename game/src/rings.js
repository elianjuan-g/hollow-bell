// HOLLOW BELL — rings.js
// Rings are the game's one verb. A strike sends a ring out from a bell at
// a fixed speed; two ring fronts arriving at the same point within the
// crossing window make a standing wave there, and only a standing wave
// shatters a seal or kills a Mute. This file owns ring expansion and the
// arrival bookkeeping that every crossing is built on.

import { RING_SPEED, RING_MAX_RADIUS } from './config.js';

// A ring: { x, y, radius, prevRadius, source, maxRadius, dead,
//           hitSeals:Set, hitMutes:Set, hitPillars:Set }.
// source is the bell id that struck it ("1", "2", "3") or a reflected
// copy ("1r", "2r"): a reflected ring counts as its own source, so one
// bell bounced off a pillar can cross with itself.
export function strikeRing(rings, x, y, source, maxRadius = RING_MAX_RADIUS) {
  rings.push({
    x,
    y,
    radius: 0,
    prevRadius: 0,
    source,
    maxRadius,
    dead: false,
    hitSeals: new Set(),
    hitMutes: new Set(),
    hitPillars: new Set(),
  });
  return rings[rings.length - 1];
}

// Expand every live ring by dt (already scaled for slow motion). A ring
// whose front is inside a Conductor's aura expands at half speed while
// it passes through it. Rings that have travelled their max radius die.
export function updateRings(rings, dt, conductor) {
  for (const ring of rings) {
    if (ring.dead) continue;
    ring.prevRadius = ring.radius;
    let speed = RING_SPEED;
    if (conductor) {
      const d = Math.hypot(ring.x - conductor.x, ring.y - conductor.y);
      if (Math.abs(ring.radius - d) < conductor.auraR) speed *= 0.5;
    }
    ring.radius += speed * dt;
    if (ring.radius >= ring.maxRadius) ring.dead = true;
  }
}

// Did this ring's front pass the given distance this frame? The front is
// a thin circle, so it crosses a point exactly once, when its radius
// reaches the point's distance from the ring's origin. A point the ring
// starts on (distance 0 — a bell placed on the seal itself) is crossed
// at once: the front is already there when the ring is struck.
export function frontCrossed(ring, distance) {
  if (distance <= 0) return ring.radius > 0;
  return ring.prevRadius < distance && distance <= ring.radius;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Record an arrival on a target (a seal or a Mute) when a ring front
// crosses it, and return true when this ring just arrived there.
// target.arrivals holds { source, t } newest last; arrivals older than
// the window are expired here so a crossing always means "within the
// window", never "sometime this chamber".
export function recordArrival(target, ring, now, window) {
  while (target.arrivals.length > 0 && now - target.arrivals[0].t > window) {
    target.arrivals.shift();
  }
  target.arrivals.push({ source: ring.source, t: now });
}

// How many distinct sources have arrived at this target within the
// window? A crossing needs `required` distinct sources.
export function distinctArrivals(target, now, window) {
  const sources = new Set();
  for (const a of target.arrivals) {
    if (now - a.t <= window) sources.add(a.source);
  }
  return sources.size;
}

// Remove the dead rings from the list, in place.
export function pruneRings(rings) {
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].dead) rings.splice(i, 1);
  }
}
