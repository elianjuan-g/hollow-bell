// HOLLOW BELL — mutes.js
// Mutes are the pressure. They crawl in from the chamber's edge toward
// the nearest bell and eat it if they arrive; a Mute that reaches the
// centre costs a Breath too. One ring front passing over a Mute only
// stuns it — two fronts crossing on it kill it, the same standing-wave
// rule as a seal.

import { CENTER, MUTE_SPEED, MUTE_STUN_SECONDS, MUTE_EAT_RADIUS, MUTE_CENTER_RADIUS } from './config.js';
import { distance, recordArrival, distinctArrivals, frontCrossed } from './rings.js';

// A Mute: { x, y, speed, stunUntil, arrivals:[], dead, eaten }.
export function createMute(x, y, speed = MUTE_SPEED) {
  return {
    x,
    y,
    speed,
    stunUntil: 0,
    arrivals: [],
    dead: false,
    eaten: false,
  };
}

// Crawl toward the nearest bell (or the centre, if no bell is placed).
// Returns events: { type: 'ate-bell', mute, bell } and
// { type: 'reached-center', mute }.
export function updateMutes(mutes, bells, dt, now) {
  const events = [];
  for (const mute of mutes) {
    if (mute.dead) continue;
    if (now < mute.stunUntil) continue;
    let tx = CENTER.x;
    let ty = CENTER.y;
    let nearest = Infinity;
    for (const bell of bells) {
      const d = distance(mute.x, mute.y, bell.x, bell.y);
      if (d < nearest) {
        nearest = d;
        tx = bell.x;
        ty = bell.y;
      }
    }
    const d = distance(mute.x, mute.y, tx, ty);
    if (d > 0.5) {
      const step = Math.min(mute.speed * dt, d);
      mute.x += ((tx - mute.x) / d) * step;
      mute.y += ((ty - mute.y) / d) * step;
    }
    // Ate a bell.
    for (const bell of bells) {
      if (distance(mute.x, mute.y, bell.x, bell.y) <= MUTE_EAT_RADIUS) {
        mute.eaten = true;
        mute.dead = true;
        events.push({ type: 'ate-bell', mute, bell });
        break;
      }
    }
    if (mute.dead) continue;
    // Reached the centre.
    if (distance(mute.x, mute.y, CENTER.x, CENTER.y) <= MUTE_CENTER_RADIUS) {
      mute.dead = true;
      events.push({ type: 'reached-center', mute });
    }
  }
  return events;
}

// Check ring fronts against Mutes: one arrival stuns, a crossing kills.
// Returns { stunned: [...], killed: [...] }.
export function checkMuteCrossings(mutes, rings, now, window) {
  const stunned = [];
  const killed = [];
  for (const mute of mutes) {
    if (mute.dead) continue;
    let arrived = false;
    for (const ring of rings) {
      if (ring.dead || ring.hitMutes.has(mute)) continue;
      const d = distance(ring.x, ring.y, mute.x, mute.y);
      if (frontCrossed(ring, d)) {
        ring.hitMutes.add(mute);
        recordArrival(mute, ring, now, window);
        arrived = true;
      }
    }
    if (!arrived) continue;
    if (distinctArrivals(mute, now, window) >= 2) {
      mute.dead = true;
      killed.push(mute);
    } else {
      mute.stunUntil = now + MUTE_STUN_SECONDS;
      stunned.push(mute);
    }
  }
  return { stunned, killed };
}

export function pruneMutes(mutes) {
  for (let i = mutes.length - 1; i >= 0; i--) {
    if (mutes[i].dead) mutes.splice(i, 1);
  }
}
