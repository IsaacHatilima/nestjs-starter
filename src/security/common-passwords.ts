import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * The blocklist the API enforces, read from `blocklist/current.txt`. That file, its manifest and every version it
 * replaced live under `src/security/blocklist/`; see the README there. It is never edited by hand: `pnpm
 * blocklist:update` fetches a new copy, archives the old one and records the change, reverting on any failure.
 *
 * Loaded once at import time. The file ships alongside the compiled code through the `assets` entry in nest-cli.json,
 * so the same relative path works from `src` under test and from `dist` in production.
 */
const BLOCKLIST_DIR = path.join(__dirname, 'blocklist');

interface BlocklistManifest {
  source: string;
  sha256: string;
  entries: number;
  installedAt: string;
}

function load(fileName: string): string {
  return readFileSync(path.join(BLOCKLIST_DIR, fileName), 'utf8');
}

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(
  load('current.txt')
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean),
);

/** Provenance of the list in force, so a running instance can say exactly which one it is enforcing. */
export const BLOCKLIST_MANIFEST = JSON.parse(load('current.json')) as BlocklistManifest;
