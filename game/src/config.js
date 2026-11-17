// HOLLOW BELL — config.js
// Every tunable number of the game in one place, so the feel can be
// retuned without hunting through the other files. Nothing here loads
// anything; these are plain constants.

export const VIEW_W = 960;
export const VIEW_H = 640;

// The chamber floor: bells, seals and mutes live inside this rectangle.
export const FLOOR = { x: 30, y: 70, w: 900, h: 500 };
export const CENTER = { x: VIEW_W / 2, y: FLOOR.y + FLOOR.h / 2 };

// A ring expands from its bell at this speed (pixels per second) and
// fades out once it has travelled this far.
export const RING_SPEED = 260;
export const RING_MAX_RADIUS = 560;
export const RING_THICKNESS = 2.5;

// Two ring fronts must arrive at a seal within this many seconds of each
// other to cross there and shatter it. Later chambers shrink it.
export const CROSS_WINDOW = 0.25;

// A strike costs one charge. A chamber hands out this many (per chamber).
export const CHARGES_PER_CHAMBER = 10;

// Breaths: the run's lives. A bell eaten, a Mute reaching the centre, or
// a charge refill each costs one. Zero Breaths ends the run.
export const START_BREATHS = 3;

// Mutes: how fast they crawl toward the bells, how long one ring stuns
// them, and how close they must get to eat a bell.
export const MUTE_SPEED = 18;
export const MUTE_STUN_SECONDS = 2;
export const MUTE_EAT_RADIUS = 16;
export const MUTE_CENTER_RADIUS = 22;

// A seal broken within this long after the previous one chains the
// multiplier up by one (x2, x3, ...).
export const CHAIN_WINDOW = 0.5;

// Score: a seal's base, a Mute kill, each charge left at chamber clear,
// and each second under the chamber's par time.
export const SCORE_SEAL = 100;
export const SCORE_MUTE = 50;
export const SCORE_CHARGE = 25;
export const SCORE_TIME_PER_SECOND = 10;

// The slow-motion hold after a crossing shatters something (real seconds).
export const SLOW_MO_SECONDS = 0.12;
export const SLOW_MO_SCALE = 0.25;

// Screen shake on a shatter, in pixels, decaying over this long.
export const SHAKE_PIXELS = 7;
export const SHAKE_SECONDS = 0.35;

// Palette: near-black ground, cyan rings, hot white-orange crossings,
// amber bells, charcoal Mutes with one dim red eye.
export const COLORS = {
  ground: '#07090c',
  floorLine: 'rgba(127, 231, 255, 0.07)',
  ring: '#7fe7ff',
  crossing: '#fff3d6',
  crossingHot: '#ff9a3c',
  bell: '#e8b34b',
  bellRing: 'rgba(232, 179, 75, 0.35)',
  seal: '#bfe9ff',
  sealCore: '#eaf7ff',
  sealCrack: '#ffffff',
  mute: '#1a1c20',
  muteRim: '#3a3d44',
  muteEye: '#c33',
  pillar: '#4a4d55',
  pillarRim: '#6a6d77',
  conductor: '#2a2133',
  conductorAura: 'rgba(150, 90, 200, 0.10)',
  text: '#cfe8ef',
  textDim: '#6d8894',
  danger: '#ff5a4e',
  gold: '#ffd479',
};

export const FONT = '"SF Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

// The Sunken Carillon: the eight chambers of a run, as one declarative
// table. Each entry names the chamber, its Chladni nodal pair (n, m)
// for the static gold pattern, its palette, and the boss phase rule
// ('none' until chamber 8, where the Silent Cantor wakes). levels.js
// reads the names from here, so the table is the single source of
// chamber identity. Chambers 1-6 teach one mechanic each; 7-8 are the
// exam (6 teaching + 2 exam), and past 8 the endless deep chambers.
export const CARILLON_CHAMBERS_SPEC = [
  { name: 'FIRST LIGHT',       chladniN: 2, chladniM: 1, palette: 'copper',    boss: 'none' },
  { name: 'DRIFT',             chladniN: 3, chladniM: 1, palette: 'copper',    boss: 'none' },
  { name: 'VERDIGRIS NAVE',    chladniN: 3, chladniM: 2, palette: 'verdigris', boss: 'none' },
  { name: 'HUNGER',            chladniN: 4, chladniM: 2, palette: 'verdigris', boss: 'none' },
  { name: 'TRINITY',           chladniN: 3, chladniM: 3, palette: 'ember',     boss: 'none' },
  { name: 'THE CONDUCTOR',     chladniN: 4, chladniM: 3, palette: 'ember',     boss: 'none' },
  { name: 'CHOIR OF STONE',    chladniN: 5, chladniM: 3, palette: 'ember',     boss: 'none' },
  { name: 'THE SILENT CANTOR', chladniN: 5, chladniM: 4, palette: 'parchment', boss: 'cantor' },
];

// Palettes: the secondary colour of each shot's world. Title is
// blue-copper-gold, the middle chambers green patina-gold, the boss
// red ember-gold, the ledger parchment-gold.
export const PALETTES = {
  copper:     { primary: '#e8b34b', secondary: '#7fb8d8' },
  verdigris:  { primary: '#7fc4a8', secondary: '#ffd479' },
  ember:      { primary: '#ff9a3c', secondary: '#ff5a4e' },
  parchment:  { primary: '#f2e3c0', secondary: '#ffd479' },
};

// Belfry Foundry colours: old bronze, verdigris patina, ember sparks,
// dark water at the floor of the foundry, parchment for the ledger.
export const FOUNDRY = {
  bronze: '#8a6a3b',
  bronzeDark: '#4a3820',
  verdigris: '#5f9e86',
  verdigrisGlow: 'rgba(127, 196, 168, 0.5)',
  ember: '#ff9a3c',
  emberHot: '#ffb35c',
  water: 'rgba(60, 110, 140, 0.35)',
  waterLine: 'rgba(127, 196, 220, 0.18)',
  chain: '#3d3428',
  arch: 'rgba(20, 16, 12, 0.9)',
  parchment: '#f2e3c0',
};

// Ranks for the result and game-over screens, by total score.
export const RANKS = [
  { min: 8000, name: 'GRAND CANTOR' },
  { min: 5000, name: 'BELLWRIGHT' },
  { min: 3000, name: 'CANTOR' },
  { min: 1500, name: 'ACOLYTE' },
  { min: 0, name: 'NOVICE' },
];

export function rankFor(score) {
  for (const r of RANKS) if (score >= r.min) return r.name;
  return 'NOVICE';
}
