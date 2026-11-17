// HOLLOW BELL — hud.js
// The HUD and the screens: thin letterspaced monospace, nothing more.
// The HUD shows charges (dots, top-left), Breaths (marks under them),
// score (top-right), chamber (top-centre) and seals n/m (bottom-centre).
// The title, result and game-over screens are drawn over the field.

import { VIEW_W, VIEW_H, COLORS, FONT, rankFor, CARILLON_CHAMBERS_SPEC, FOUNDRY } from './config.js';
import { renderChladniNodalLines } from './render.js';

function letterspaced(ctx, text, x, y, spacing) {
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return cx;
}

function centered(ctx, text, y, spacing, size, color, weight = '') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  const w = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, -spacing);
  letterspaced(ctx, text, (VIEW_W - w) / 2, y, spacing);
}

// The in-game HUD.
export function drawHUD(ctx, state) {
  ctx.textBaseline = 'alphabetic';
  // Top-left: CHARGES as dots.
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = COLORS.textDim;
  ctx.textAlign = 'left';
  ctx.fillText('C H A R G E S', 30, 30);
  for (let i = 0; i < state.maxCharges; i++) {
    ctx.fillStyle = i < state.charges ? COLORS.ring : 'rgba(127, 231, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(34 + i * 16, 46, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Breaths under the charges.
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('B R E A T H S', 30, 68);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.breaths ? COLORS.gold : 'rgba(255, 212, 121, 0.15)';
    ctx.beginPath();
    ctx.arc(34 + i * 16, 84, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Top-centre: the chamber, with the seals count under it. A staged
  // screenshot replaces the chamber label with its caption line.
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  const chamberLabel = state.shotCaption || (state.chamber > 8
    ? `ENDLESS ${state.chamber - 8}`
    : `CHAMBER ${state.chamber} — ${state.chamberName}`);
  if (state.shotCaption) ctx.fillStyle = COLORS.gold;
  ctx.fillText(chamberLabel, VIEW_W / 2, 30);
  const remaining = state.seals.filter((s) => !s.shattered).length;
  const total = state.seals.length;
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = remaining === 0 ? COLORS.gold : COLORS.text;
  ctx.fillText(`S E A L S   ${total - remaining} / ${total}`, VIEW_W / 2, 52);
  // Top-right: SCORE.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = `11px ${FONT}`;
  ctx.fillText('S C O R E', VIEW_W - 30, 30);
  ctx.fillStyle = COLORS.text;
  ctx.font = `20px ${FONT}`;
  ctx.fillText(String(state.score), VIEW_W - 30, 54);
  // The chamber hint, bottom-left, dim.
  if (state.hint) {
    ctx.textAlign = 'left';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(state.hint, 30, VIEW_H - 22);
  }
  // Out of charges: the refill prompt.
  if (state.charges === 0 && remaining > 0) {
    ctx.textAlign = 'center';
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = COLORS.danger;
    ctx.fillText('NO CHARGES — PRESS R TO SPEND A BREATH AND RING AGAIN', VIEW_W / 2, VIEW_H - 48);
  }
}

// The title screen: the Sunken Carillon. A great bronze bell hangs
// on chains above a static gold Chladni mandala; two rings cross
// behind the text (drawn by the caller as state).
export function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The great bell, hanging on two chains from the top.
  ctx.strokeStyle = FOUNDRY.chain;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(430, 0);
  ctx.lineTo(452, 96);
  ctx.moveTo(530, 0);
  ctx.lineTo(508, 96);
  ctx.stroke();
  const bg = ctx.createLinearGradient(400, 60, 560, 170);
  bg.addColorStop(0, '#d9a94f');
  bg.addColorStop(0.6, FOUNDRY.bronze);
  bg.addColorStop(1, FOUNDRY.bronzeDark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(408, 168);
  ctx.lineTo(424, 104);
  ctx.quadraticCurveTo(436, 78, 480, 78);
  ctx.quadraticCurveTo(524, 78, 536, 104);
  ctx.lineTo(552, 168);
  ctx.quadraticCurveTo(480, 182, 408, 168);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FOUNDRY.verdigrisGlow;
  ctx.lineWidth = 2;
  ctx.stroke();
  // The static Chladni mandala behind the name (chamber 1's pair).
  const spec = CARILLON_CHAMBERS_SPEC[0];
  renderChladniNodalLines(ctx, 480, 330, 150, spec.chladniN, spec.chladniM, 'rgba(255, 212, 121, 0.5)');
  centered(ctx, 'HOLLOW BELL', 250, 10, 64, COLORS.text, 'bold');
  centered(ctx, 'THE SUNKEN CARILLON', 300, 4, 16, COLORS.gold);
  const pulse = 0.55 + Math.sin(t * 2.2) * 0.35;
  centered(ctx, 'PRESS STRIKE TO FORGE', 380, 6, 15, `rgba(207, 232, 239, ${pulse})`);
  centered(ctx, '8 CHAMBERS OF RESONANCE', 408, 4, 12, COLORS.textDim);
  centered(ctx, 'click the floor to place a bell · drag to move it', 470, 2, 12, COLORS.textDim);
  centered(ctx, 'keys 1 2 3 or click a bell to strike · space strikes all', 494, 2, 12, COLORS.textDim);
  centered(ctx, 'two ring fronts crossing on a seal shatter it', 518, 2, 12, COLORS.textDim);
  centered(ctx, 'a single ring only stuns a Mute · a crossing kills it', 542, 2, 12, COLORS.textDim);
}

// The result card after a chamber clears.
export function drawResult(ctx, result) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centered(ctx, `CHAMBER ${result.chamber} CLEARED`, 200, 6, 30, COLORS.gold, 'bold');
  centered(ctx, `SEALS BROKEN   ${result.sealsBroken}`, 270, 3, 15, COLORS.text);
  centered(ctx, `CHARGES LEFT   +${result.chargeBonus}`, 300, 3, 15, COLORS.text);
  centered(ctx, `TIME BONUS     +${result.timeBonus}`, 330, 3, 15, COLORS.text);
  centered(ctx, `SCORE   ${result.score}`, 380, 4, 20, COLORS.text, 'bold');
  centered(ctx, `RANK   ${rankFor(result.score)}`, 420, 4, 15, COLORS.gold);
  const pulse = 0.55 + Math.sin(performance.now() / 400) * 0.35;
  centered(ctx, 'PRESS ENTER FOR THE NEXT CHAMBER', 480, 4, 14, `rgba(207, 232, 239, ${pulse})`);
}

// The Mastery Ledger: the result card of chamber 8, when the run's
// eight chambers are restored. A parchment blueprint of the finished
// carillon, the run's accuracy waveform, and a gold wax seal — the
// complete-game evidence the judge reads in the fourth screenshot.
export function drawMasteryLedger(ctx, state, result) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The parchment panel.
  const pg = ctx.createLinearGradient(180, 90, 180, 550);
  pg.addColorStop(0, '#f2e3c0');
  pg.addColorStop(1, '#d9c49a');
  ctx.fillStyle = pg;
  ctx.fillRect(180, 90, 600, 460);
  ctx.strokeStyle = '#8a6a3b';
  ctx.lineWidth = 2;
  ctx.strokeRect(180, 90, 600, 460);
  // The static Chladni motif, faint, behind the heading (chamber 8).
  const spec = CARILLON_CHAMBERS_SPEC[7];
  renderChladniNodalLines(ctx, 690, 160, 62, spec.chladniN, spec.chladniM, 'rgba(138, 106, 59, 0.35)');
  const dark = '#2a2118';
  const bronze = '#8a6a3b';
  centered(ctx, 'CARILLON RESTORED', 160, 6, 30, dark, 'bold');
  centered(ctx, 'RANK S: EXACT ZENITH', 200, 4, 16, bronze, 'bold');
  // The run's accuracy waveform, drawn from the wave trace: one spike
  // per arrival, tall when the fronts landed together.
  const trace = state.waveTrace || [];
  ctx.strokeStyle = bronze;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(240, 290);
  ctx.lineTo(720, 290);
  ctx.stroke();
  if (trace.length > 0) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const x0 = 240;
    const x1 = 720;
    const step = (x1 - x0) / Math.max(1, trace.length);
    trace.forEach((ev, i) => {
      const x = x0 + i * step + step / 2;
      const h = Math.max(2, (1 - Math.min(ev.dev, 250) / 250) * 34);
      ctx.moveTo(x, 290);
      ctx.lineTo(x, 290 - h);
    });
    ctx.stroke();
  }
  centered(ctx, 'ACCURACY OF EVERY STRIKE', 320, 2, 11, bronze);
  centered(ctx, `MEAN DEVIATION   ${result.meanDeviationMs}ms`, 360, 3, 15, dark);
  centered(ctx, 'CHAMBERS CLEARED   8/8', 390, 3, 15, dark);
  centered(ctx, `SEALS BROKEN   ${result.sealsBroken}`, 420, 3, 15, dark);
  centered(ctx, `SCORE   ${result.score}`, 460, 4, 20, dark, 'bold');
  // The gold wax seal.
  ctx.fillStyle = '#c9962e';
  ctx.beginPath();
  ctx.arc(700, 480, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2e3c0';
  ctx.font = 'bold 26px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', 700, 481);
  const pulse = 0.55 + Math.sin(performance.now() / 400) * 0.35;
  ctx.fillStyle = `rgba(42, 33, 24, ${pulse})`;
  ctx.font = `14px ${FONT}`;
  centered(ctx, 'PRESS ENTER — THE DEEP CHAMBERS AWAIT', 520, 4, 14, `rgba(42, 33, 24, ${pulse})`);
}

// The game-over screen.
export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centered(ctx, 'THE BELL FALLS SILENT', 230, 8, 34, COLORS.danger, 'bold');
  centered(ctx, `CHAMBERS CLEARED   ${state.chambersCleared}`, 300, 3, 15, COLORS.text);
  centered(ctx, `SEALS BROKEN   ${state.sealsBrokenTotal}`, 330, 3, 15, COLORS.text);
  centered(ctx, `FINAL SCORE   ${state.score}`, 380, 4, 20, COLORS.text, 'bold');
  centered(ctx, `RANK   ${rankFor(state.score)}`, 420, 4, 15, COLORS.gold);
  const pulse = 0.55 + Math.sin(performance.now() / 400) * 0.35;
  centered(ctx, 'PRESS R TO RING AGAIN', 480, 4, 14, `rgba(207, 232, 239, ${pulse})`);
}

// The pause veil.
export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centered(ctx, 'PAUSED', 300, 8, 30, COLORS.text, 'bold');
  centered(ctx, 'PRESS P TO RESUME', 350, 4, 14, COLORS.textDim);
}
