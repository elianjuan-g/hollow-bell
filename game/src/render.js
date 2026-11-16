// HOLLOW BELL — render.js
// Everything the player sees, drawn with the canvas 2D API and nothing
// else: no sprites, no images. The ground is near-black; rings are thin
// cyan strokes whose alpha falls off with radius; a crossing is a hot
// white-orange lens flare drawn additive; seals are faceted crystals
// with an interior glow that cracks into white-hot lines.

import { VIEW_W, VIEW_H, FLOOR, CENTER, COLORS } from './config.js';
import { distance } from './rings.js';

// A soft radial glow centred on (x, y), additive.
function glow(ctx, x, y, radius, core, edge) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, core);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A faint grid, so the eye can judge distances.
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = FLOOR.x; x <= FLOOR.x + FLOOR.w; x += 60) {
    ctx.moveTo(x, FLOOR.y);
    ctx.lineTo(x, FLOOR.y + FLOOR.h);
  }
  for (let y = FLOOR.y; y <= FLOOR.y + FLOOR.h; y += 60) {
    ctx.moveTo(FLOOR.x, y);
    ctx.lineTo(FLOOR.x + FLOOR.w, y);
  }
  ctx.stroke();
  // The chamber's edge.
  ctx.strokeStyle = 'rgba(127, 231, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // The heart of the chamber: a dim mark at the centre.
  ctx.strokeStyle = 'rgba(127, 231, 255, 0.10)';
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPillars(ctx, pillars) {
  for (const p of pillars) {
    ctx.fillStyle = COLORS.pillar;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.pillarRim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawConductor(ctx, conductor, t) {
  if (!conductor) return;
  // The slow aura: a faint violet disc that breathes.
  const pulse = 1 + Math.sin(t * 1.6) * 0.04;
  ctx.fillStyle = COLORS.conductorAura;
  ctx.beginPath();
  ctx.arc(conductor.x, conductor.y, conductor.auraR * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 120, 220, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // The Conductor itself: a dark violet knot.
  ctx.fillStyle = COLORS.conductor;
  ctx.beginPath();
  ctx.arc(conductor.x, conductor.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 150, 255, 0.5)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(200, 150, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(conductor.x, conductor.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBells(ctx, bells, now) {
  for (const bell of bells) {
    // A struck bell flashes.
    const sinceStrike = now - bell.lastStrike;
    if (sinceStrike < 0.25) {
      const a = 1 - sinceStrike / 0.25;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bell.x, bell.y, 46, `rgba(255, 220, 140, ${0.5 * a})`, 'rgba(255, 220, 140, 0)');
      ctx.restore();
    }
    // The bell's aura ring.
    ctx.strokeStyle = COLORS.bellRing;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bell.x, bell.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    // The bell: an amber disc.
    ctx.fillStyle = COLORS.bell;
    ctx.beginPath();
    ctx.arc(bell.x, bell.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#07090c';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bell.id), bell.x, bell.y + 0.5);
  }
}

function drawRings(ctx, rings) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ring of rings) {
    if (ring.dead || ring.radius <= 0) continue;
    const fade = Math.max(0, 1 - ring.radius / ring.maxRadius);
    const alpha = 0.25 + 0.65 * fade;
    // A wide faint glow under the crisp front.
    ctx.strokeStyle = `rgba(127, 231, 255, ${0.10 * fade})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    // The front itself: a thin bright stroke.
    ctx.strokeStyle = `rgba(127, 231, 255, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// A faceted crystal: a hexagon with an interior glow, and white-hot
// crack lines for every near-miss it has taken.
function drawSeal(ctx, seal, t) {
  if (seal.shattered) return;
  const r = seal.r;
  const breathe = 1 + Math.sin(t * 2 + seal.phase) * 0.05;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([seal.x + Math.cos(a) * r * breathe, seal.y + Math.sin(a) * r * 1.25 * breathe]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, seal.x, seal.y, r * 2.2, 'rgba(120, 200, 255, 0.20)', 'rgba(120, 200, 255, 0)');
  ctx.restore();
  // The facet.
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  const g = ctx.createRadialGradient(seal.x, seal.y, 0, seal.x, seal.y, r * 1.4);
  g.addColorStop(0, COLORS.sealCore);
  g.addColorStop(0.55, COLORS.seal);
  g.addColorStop(1, 'rgba(90, 160, 200, 0.25)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 250, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Facet lines.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(seal.x, seal.y - r * 1.1);
  ctx.lineTo(seal.x, seal.y + r * 1.1);
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.stroke();
  // Cracks: white-hot lines from the core outward, one per near-miss.
  if (seal.cracks > 0) {
    ctx.strokeStyle = COLORS.sealCrack;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    for (let i = 0; i < seal.cracks; i++) {
      const a = seal.phase + i * 2.1 + 0.6;
      ctx.beginPath();
      ctx.moveTo(seal.x, seal.y);
      ctx.lineTo(seal.x + Math.cos(a) * r * 0.95, seal.y + Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  // A triple seal wears a second, smaller facet inside it.
  if (seal.kind === 'triple') {
    ctx.strokeStyle = 'rgba(255, 212, 121, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(seal.x, seal.y, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMutes(ctx, mutes, bells, now) {
  for (const mute of mutes) {
    if (mute.dead) continue;
    const stunned = now < mute.stunUntil;
    // The blob: a matte charcoal disc with a ragged rim.
    ctx.fillStyle = COLORS.mute;
    ctx.beginPath();
    ctx.arc(mute.x, mute.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stunned ? 'rgba(127, 231, 255, 0.7)' : COLORS.muteRim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // One dim red eye, facing its target.
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
    const d = Math.max(0.1, distance(mute.x, mute.y, tx, ty));
    const ex = mute.x + ((tx - mute.x) / d) * 6;
    const ey = mute.y + ((ty - mute.y) / d) * 6;
    ctx.fillStyle = stunned ? 'rgba(127, 231, 255, 0.9)' : COLORS.muteEye;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color.replace('A', String(a));
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The standing wave at a crossing: a hot white-orange lens flare,
// additive, with bloom. `flare.life` counts down from 1.
function drawFlares(ctx, flares) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of flares) {
    const a = Math.max(0, f.life);
    const r = 26 + (1 - a) * 30;
    glow(ctx, f.x, f.y, r * 2.2, `rgba(255, 154, 60, ${0.28 * a})`, 'rgba(255, 154, 60, 0)');
    glow(ctx, f.x, f.y, r, `rgba(255, 243, 214, ${0.9 * a})`, 'rgba(255, 243, 214, 0)');
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 3.5 * a + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Draw the whole playing field. `state` carries bells, rings, seals,
// mutes, pillars, conductor, particles and flares; `t` is the render
// clock (seconds) for breathing and pulsing.
export function drawWorld(ctx, state, t) {
  ctx.save();
  if (state.shake > 0.2) {
    const s = state.shake;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }
  drawFloor(ctx);
  drawPillars(ctx, state.pillars);
  drawConductor(ctx, state.conductor, t);
  drawBells(ctx, state.bells, state.time);
  drawRings(ctx, state.rings);
  for (const seal of state.seals) drawSeal(ctx, seal, t);
  drawMutes(ctx, state.mutes, state.bells, state.time);
  drawFlares(ctx, state.flares);
  drawParticles(ctx, state.particles);
  ctx.restore();
  // A vignette over everything, so the edges fall into black.
  const v = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
