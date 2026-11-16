// HOLLOW BELL — main.ts (the entrypoint, Node 22, standard library only)
//
// This program hands the game in: it copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
// The game itself is plain static files under game/ (index.html plus ES
// modules, no library, no network request) that any static server can
// serve and a desktop browser plays offline.
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Hand it in: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
// (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The output starts empty in practice; make sure it exists either way.
mkdirSync(outputDir, { recursive: true });

// The game: every file under game/, as it stands.
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots: 3 or 4 renders of the game, the first by name the cover.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier, byte for byte as the vendored library writes it from
// game/ and screenshots/. The caps mirror the scorer's own: the text
// the judge reads is capped, screenshots are at most 4 and 256 KiB
// each, and game/ stays inside its file, byte and path limits.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
