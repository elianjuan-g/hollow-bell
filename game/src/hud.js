// HOLLOW BELL — hud.js
// The HUD and the screens: thin letterspaced monospace, nothing more.
// The HUD shows charges (dots, top-left), Breaths (marks under them),
// score (top-right), chamber (top-centre) and seals n/m (bottom-centre).
// The title, result and game-over screens are drawn over the field.

import { VIEW_W, VIEW_H, COLORS, FONT, rankFor } from './config.js';

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
  // Top-centre: the chamber, with the seals count under it.
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  const chamberLabel = state.chamber > 10
    ? `ENDLESS ${state.chamber - 10}`
    : `CHAMBER ${state.chamber} — ${state.chamberName}`;
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

// The title screen: the name, the caption, "press any key", and two
// rings mid-intersection behind it (drawn by the caller as state).
export function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(7, 9, 12, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centered(ctx, 'HOLLOW BELL', 250, 10, 64, COLORS.text, 'bold');
  centered(ctx, 'strike. wait. cross.', 300, 4, 16, COLORS.textDim);
  const pulse = 0.55 + Math.sin(t * 2.2) * 0.35;
  centered(ctx, 'PRESS ANY KEY', 380, 6, 15, `rgba(207, 232, 239, ${pulse})`);
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
