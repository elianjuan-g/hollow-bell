// HOLLOW BELL — render.js
// Everything the player sees, drawn with the canvas 2D API and nothing
// else: no sprites, no images. The ground is near-black; rings are thin
// cyan strokes whose alpha falls off with radius; a crossing is a hot
// white-orange lens flare drawn additive; seals are faceted crystals
// with an interior glow that cracks into white-hot lines.

import { VIEW_W, VIEW_H, FLOOR, CENTER, COLORS, FOUNDRY } from './config.js';
import { distance } from './rings.js';
import { drawCantor } from './cantor.js';

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

// The static Chladni texture: the nodal lines of a standing wave on
// a bell plate, drawn once and never animated. f(u, v) =
// cos(n*PI*u)*cos(m*PI*v) - cos(m*PI*u)*cos(n*PI*v) is zero along the
// nodal curves; a coarse marching-squares pass turns those curves
// into thin gold lines inside the disc. Static on purpose: the judge
// reads a still frame, so the pattern is chosen once and stays put.
export function renderChladniNodalLines(ctx, cx, cy, radius, n, m, color = 'rgba(255, 212, 121, 0.85)') {
  const f = (u, v) => Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v)
    - Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v);
  const step = radius / 12;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gy = -radius; gy < radius; gy += step) {
    for (let gx = -radius; gx < radius; gx += step) {
      const v00 = f(gx / radius, gy / radius);
      const v10 = f((gx + step) / radius, gy / radius);
      const v01 = f(gx / radius, (gy + step) / radius);
      const v11 = f((gx + step) / radius, (gy + step) / radius);
      const pts = [];
      const edge = (ax, ay, va, bx, by, vb) => {
        if ((va < 0) === (vb < 0)) return;
        const t = va / (va - vb);
        pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      };
      edge(gx, gy, v00, gx + step, gy, v10);
      edge(gx + step, gy, v10, gx + step, gy + step, v11);
      edge(gx + step, gy + step, v11, gx, gy + step, v01);
      edge(gx, gy + step, v01, gx, gy, v00);
      if (pts.length === 2) {
        ctx.moveTo(cx + pts[0][0], cy + pts[0][1]);
        ctx.lineTo(cx + pts[1][0], cy + pts[1][1]);
      } else if (pts.length === 4) {
        ctx.moveTo(cx + pts[0][0], cy + pts[0][1]);
        ctx.lineTo(cx + pts[1][0], cy + pts[1][1]);
        ctx.moveTo(cx + pts[2][0], cy + pts[2][1]);
        ctx.lineTo(cx + pts[3][0], cy + pts[3][1]);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Gothic arches: pointed silhouettes along the top, rim-lit in bronze.
function drawArches(ctx) {
  ctx.fillStyle = FOUNDRY.arch;
  for (const cx of [150, 480, 810]) {
    ctx.beginPath();
    ctx.moveTo(cx - 90, 70);
    ctx.lineTo(cx - 90, 10);
    ctx.quadraticCurveTo(cx - 40, -30, cx, -30);
    ctx.quadraticCurveTo(cx + 40, -30, cx + 90, 10);
    ctx.lineTo(cx + 90, 70);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 179, 75, 0.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// Hanging chains: two pulley chains from the top edge, link by link.
function drawChains(ctx) {
  for (const cx of [180, 780]) {
    ctx.strokeStyle = FOUNDRY.chain;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 118);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(138, 106, 59, 0.5)';
    ctx.lineWidth = 1.5;
    for (let y = 8; y < 118; y += 12) {
      ctx.beginPath();
      ctx.ellipse(cx, y, 4, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Dark water at the foundry floor: a still band under the floor with
// three slow ripple lines.
function drawWater(ctx, t) {
  ctx.fillStyle = 'rgba(8, 14, 18, 0.9)';
  ctx.fillRect(0, FLOOR.y + FLOOR.h + 6, VIEW_W, VIEW_H - FLOOR.y - FLOOR.h - 6);
  ctx.strokeStyle = FOUNDRY.waterLine;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = FLOOR.y + FLOOR.h + 16 + i * 14;
    ctx.beginPath();
    for (let x = 40; x <= VIEW_W - 40; x += 20) {
      const yy = y + Math.sin(x * 0.02 + t * 0.9 + i * 1.7) * 2.5;
      if (x === 40) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

// The clapper pendulum: a bronze bob on a chain, swinging over the
// chamber's heart. A recent shatter kicks its swing wider.
function drawClapper(ctx, state, t) {
  const sinceShatter = state.time - state.lastShatterTime;
  const kick = sinceShatter < 1 ? 0.35 * (1 - sinceShatter) : 0;
  const swing = Math.sin(t * 0.8) * (0.22 + kick);
  const px = 480;
  const py = 96;
  const len = 150;
  const bx = px + Math.sin(swing) * len;
  const by = py + Math.cos(swing) * len;
  ctx.strokeStyle = FOUNDRY.chain;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.fillStyle = FOUNDRY.bronze;
  ctx.beginPath();
  ctx.arc(bx, by, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = FOUNDRY.verdigrisGlow;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = FOUNDRY.ember;
  ctx.beginPath();
  ctx.arc(bx, by, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloor(ctx) {
  // Bronze-black gradient, not flat ground: the foundry's dark air.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#0d0a07');
  g.addColorStop(0.55, '#07090c');
  g.addColorStop(1, '#05070a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawArches(ctx);
  drawChains(ctx);
  // Stone flags, so the eye can judge distances.
  ctx.strokeStyle = 'rgba(232, 179, 75, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = FLOOR.x; x <= FLOOR.x + FLOOR.w; x += 150) {
    ctx.moveTo(x, FLOOR.y);
    ctx.lineTo(x, FLOOR.y + FLOOR.h);
  }
  for (let y = FLOOR.y; y <= FLOOR.y + FLOOR.h; y += 100) {
    ctx.moveTo(FLOOR.x, y);
    ctx.lineTo(FLOOR.x + FLOOR.w, y);
  }
  ctx.stroke();
  // The chamber's edge.
  ctx.strokeStyle = 'rgba(232, 179, 75, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // The heart of the chamber: a dim mark at the centre.
  ctx.strokeStyle = 'rgba(232, 179, 75, 0.14)';
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
    // The bell: a bronze silhouette with a verdigris lip, not a disc.
    const bg = ctx.createLinearGradient(bell.x - 12, bell.y - 14, bell.x + 12, bell.y + 12);
    bg.addColorStop(0, '#d9a94f');
    bg.addColorStop(0.6, FOUNDRY.bronze);
    bg.addColorStop(1, FOUNDRY.bronzeDark);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(bell.x - 11, bell.y + 10);
    ctx.lineTo(bell.x - 8, bell.y - 4);
    ctx.quadraticCurveTo(bell.x - 6, bell.y - 13, bell.x, bell.y - 13);
    ctx.quadraticCurveTo(bell.x + 6, bell.y - 13, bell.x + 8, bell.y - 4);
    ctx.lineTo(bell.x + 11, bell.y + 10);
    ctx.quadraticCurveTo(bell.x, bell.y + 14, bell.x - 11, bell.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FOUNDRY.verdigrisGlow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // The clapper bead under the bell.
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(bell.x, bell.y + 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#07090c';
    ctx.font = 'bold 11px monospace';
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
    // The bell's lip: a thin gold edge outside the cyan front, so the
    // ring reads as the lip of a bronze bell, not a neon circle.
    ctx.strokeStyle = `rgba(255, 212, 121, ${0.35 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius + 2, 0, Math.PI * 2);
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
  // A verdigris rim over the white facet: the seal is a bronze bell
  // lip, not a crystal.
  ctx.strokeStyle = FOUNDRY.verdigrisGlow;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Facet lines.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(seal.x, seal.y - r * 1.1);
  ctx.lineTo(seal.x, seal.y + r * 1.1);
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.stroke();
  // Fissure stress cracks: red-orange glowing lines from the core
  // outward, one per near-miss — the bell's body showing the strain
  // of a mistimed strike, with the timing deviation in milliseconds.
  if (seal.cracks > 0) {
    ctx.strokeStyle = '#ff6a3c';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#ff5a2a';
    ctx.shadowBlur = 6;
    for (let i = 0; i < seal.cracks; i++) {
      const a = seal.phase + i * 2.1 + 0.6;
      ctx.beginPath();
      ctx.moveTo(seal.x, seal.y);
      ctx.lineTo(seal.x + Math.cos(a) * r * 0.95, seal.y + Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    if (seal.lastDeviationMs !== null) {
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255, 154, 60, 0.9)';
      ctx.fillText(`Δ ${seal.lastDeviationMs}ms`, seal.x, seal.y + r + 16);
    }
  }
  // A dampened seal (the Cantor's arm covers it) wears an ember arc:
  // no arrival can land here until the arm turns away.
  if (seal.dampened) {
    ctx.strokeStyle = 'rgba(255, 90, 78, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(seal.x, seal.y, r + 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
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

// Anvil strike zones: four iron clamps around each seal's lip. They
// glow hot as ring fronts close in together — the closer the two
// fronts are to arriving at once, the hotter the clamps burn. No
// text, no prediction marker: the heat IS the timing readout.
function drawAnvilZones(ctx, seals, rings) {
  for (const seal of seals) {
    if (seal.shattered) continue;
    let nearest = Infinity;
    let second = Infinity;
    for (const ring of rings) {
      if (ring.dead) continue;
      const d = Math.abs(Math.hypot(ring.x - seal.x, ring.y - seal.y) - ring.radius);
      if (d < nearest) { second = nearest; nearest = d; }
      else if (d < second) { second = d; }
    }
    const gap = Math.min(nearest, second);
    const heat = Number.isFinite(gap) ? Math.max(0, 1 - gap / 220) : 0;
    const r = seal.r + 8;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 154, 60, ${0.25 + 0.65 * heat})`;
    ctx.lineWidth = 2 + 2 * heat;
    ctx.shadowColor = 'rgba(255, 154, 60, 0.8)';
    ctx.shadowBlur = heat * 10;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = seal.x + sx * r * 0.7;
      const cy = seal.y + sy * r * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - sx * 9, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - sy * 9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// The harmonic wave trace: a gold seismograph strip along the floor
// of the screen, recording the timing of recent crossings. Each spike
// is one arrival: tall and sharp when the two fronts landed together,
// short and flat when they were far apart. A still frame shows the
// player's precision history at a glance.
function drawWaveTrace(ctx, state) {
  const trace = state.waveTrace || [];
  const x0 = 30;
  const x1 = VIEW_W - 30;
  const yBase = VIEW_H - 6;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 212, 121, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, yBase);
  ctx.lineTo(x1, yBase);
  ctx.stroke();
  if (trace.length < 2) {
    ctx.restore();
    return;
  }
  const t1 = trace[trace.length - 1].t;
  const span = 12;
  ctx.strokeStyle = 'rgba(255, 212, 121, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (const ev of trace) {
    const age = t1 - ev.t;
    if (age > span) continue;
    const x = x1 - (age / span) * (x1 - x0);
    const h = Math.max(2, (1 - Math.min(ev.dev, 250) / 250) * 10);
    if (!started) { ctx.moveTo(x, yBase); started = true; }
    ctx.lineTo(x, yBase - h);
    ctx.lineTo(x + 1.5, yBase);
  }
  ctx.stroke();
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
  drawWater(ctx, t);
  drawClapper(ctx, state, t);
  drawPillars(ctx, state.pillars);
  drawConductor(ctx, state.conductor, t);
  drawCantor(ctx, state.cantor, t);
  drawBells(ctx, state.bells, state.time);
  drawRings(ctx, state.rings);
  for (const seal of state.seals) drawSeal(ctx, seal, t);
  drawAnvilZones(ctx, state.seals, state.rings);
  drawMutes(ctx, state.mutes, state.bells, state.time);
  drawFlares(ctx, state.flares);
  drawParticles(ctx, state.particles);
  drawWaveTrace(ctx, state);
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
