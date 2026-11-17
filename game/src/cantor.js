// HOLLOW BELL — cantor.js
// The Silent Cantor: the boss of chamber 8. A concentric gear crown
// at the chamber's heart, turning three iron dampener arms. An arm
// covers one angular sector of the floor; a ring front that arrives
// at a seal inside a covered sector is damped — the arrival is lost,
// the seal does not crack, and the player must strike again once the
// arms have turned away. The arms never stop, so the boss is a timing
// puzzle, not a damage race: strike for the open window.

// A Cantor: { x, y, angle, armSpeed, armCount, armHalfWidth, armLen }.
// angle is the rotation of the first arm (radians); the other two sit
// 120 degrees apart. armHalfWidth is half the sector an arm covers.
export function createCantor(x, y) {
  return {
    x,
    y,
    angle: 0,
    armSpeed: 0.35,
    armCount: 3,
    armHalfWidth: 0.42,
    armLen: 210,
  };
}

export function updateCantor(cantor, dt) {
  if (!cantor) return;
  cantor.angle = (cantor.angle + cantor.armSpeed * dt) % (Math.PI * 2);
}

// The angle of a point as seen from the Cantor, in [0, 2PI).
function angleOf(cantor, x, y) {
  let a = Math.atan2(y - cantor.y, x - cantor.x);
  if (a < 0) a += Math.PI * 2;
  return a;
}

// Is an angle inside one of the Cantor's dampener sectors?
function angleDampened(cantor, a) {
  for (let i = 0; i < cantor.armCount; i++) {
    const arm = (cantor.angle + (i * Math.PI * 2) / cantor.armCount) % (Math.PI * 2);
    let d = Math.abs(a - arm);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d <= cantor.armHalfWidth) return true;
  }
  return false;
}

// Mark every seal dampened or open, by whether its angle from the
// Cantor falls inside a dampener arm's sector. Returns the dampened
// seals. main.js calls this once per frame, before checking crossings,
// and passes seal.dampened to checkSealCrossings so damped arrivals
// are never recorded.
export function evaluateCantorDampenerCollision(rings, cantor, seals, now) {
  if (!cantor) return [];
  const dampened = [];
  for (const seal of seals) {
    if (seal.shattered) {
      seal.dampened = false;
      continue;
    }
    seal.dampened = angleDampened(cantor, angleOf(cantor, seal.x, seal.y));
    if (seal.dampened) dampened.push(seal);
  }
  return dampened;
}

// Draw the Cantor: a toothed gear crown, three iron dampener arms
// turning slowly, and a dark hub with one dim ember eye.
export function drawCantor(ctx, cantor, t) {
  if (!cantor) return;
  const { x, y } = cantor;
  ctx.save();
  // Gear crown: a dark ring with teeth.
  ctx.fillStyle = '#241d16';
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a5636';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#4a3820';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.05;
    ctx.save();
    ctx.translate(x + Math.cos(a) * 48, y + Math.sin(a) * 48);
    ctx.rotate(a);
    ctx.fillRect(-2, -5, 6, 10);
    ctx.restore();
  }
  // Inner ring.
  ctx.strokeStyle = 'rgba(255, 154, 60, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.stroke();
  // Dampener arms: thick iron bars with serrated tips.
  for (let i = 0; i < cantor.armCount; i++) {
    const a = cantor.angle + (i * Math.PI * 2) / cantor.armCount;
    const ex = x + Math.cos(a) * cantor.armLen;
    const ey = y + Math.sin(a) * cantor.armLen;
    ctx.strokeStyle = '#3d3428';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 90, 78, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Serrated tip: a small iron claw at the arm's end.
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(ex, ey, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 90, 78, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Hub: dark, with one dim ember eye that opens as arms turn.
  ctx.fillStyle = '#120e0a';
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a5636';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const eyePulse = 0.5 + Math.sin(t * 1.4) * 0.3;
  ctx.fillStyle = `rgba(255, 90, 78, ${eyePulse})`;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
