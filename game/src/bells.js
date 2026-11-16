// HOLLOW BELL — bells.js
// Bells are the player's instruments: placed on the floor with the mouse,
// dragged to reposition, struck with keys 1/2/3 or a click. A strike
// costs one charge and sends one ring out. Placement is the spatial
// decision of the game — wide for coverage, tight for fast crossings.

import { FLOOR } from './config.js';

// A bell: { id, x, y, lastStrike }.
export function createBell(id, x, y) {
  return { id, x, y, lastStrike: -10 };
}

// Place a bell on the floor (clamped inside it). Returns the bell, or
// null when the chamber's bell limit is already reached.
export function placeBell(bells, maxBells, x, y) {
  if (bells.length >= maxBells) return null;
  const id = bells.length + 1;
  const bell = createBell(
    id,
    Math.max(FLOOR.x + 16, Math.min(FLOOR.x + FLOOR.w - 16, x)),
    Math.max(FLOOR.y + 16, Math.min(FLOOR.y + FLOOR.h - 16, y)),
  );
  bells.push(bell);
  return bell;
}

// The bell under a point, if any (within its grab radius).
export function bellAt(bells, x, y, radius = 22) {
  for (let i = bells.length - 1; i >= 0; i--) {
    const b = bells[i];
    if (Math.hypot(b.x - x, b.y - y) <= radius) return b;
  }
  return null;
}

export function bellById(bells, id) {
  return bells.find((b) => b.id === id) || null;
}

// Remove a bell (eaten by a Mute). The remaining bells keep their ids.
export function removeBell(bells, bell) {
  const i = bells.indexOf(bell);
  if (i !== -1) bells.splice(i, 1);
}

// Drag a bell to a new floor position.
export function moveBell(bell, x, y) {
  bell.x = Math.max(FLOOR.x + 16, Math.min(FLOOR.x + FLOOR.w - 16, x));
  bell.y = Math.max(FLOOR.y + 16, Math.min(FLOOR.y + FLOOR.h - 16, y));
}
