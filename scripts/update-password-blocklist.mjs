#!/usr/bin/env node
// Replaces the password blocklist with a freshly fetched copy, keeping every version it replaced.
//
// The whole operation is all-or-nothing: the previous current.txt, current.json and HISTORY.md are held in memory,
// and any failure after the first write puts all three back before exiting non-zero. A download that is not
// recognisably a password list is rejected before anything on disk is touched.
//
//   pnpm blocklist:update [--source <url>] [--dry-run]
//   pnpm blocklist:check

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'src', 'security', 'blocklist');
const CURRENT_TXT = path.join(DIR, 'current.txt');
const CURRENT_JSON = path.join(DIR, 'current.json');
const HISTORY = path.join(DIR, 'HISTORY.md');
const ARCHIVE = path.join(DIR, 'archive');

// The UK NCSC list, derived from Have I Been Pwned, mirrored in SecLists. A named public body is easier to cite in
// a security review than a community wordlist.
const DEFAULT_SOURCE =
  'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt';
const DEFAULT_SOURCE_NAME = 'NCSC top 100k (via SecLists)';

const MIN_ENTRIES = 100;
const MAX_ENTRY_LENGTH = 128;
// If a download does not contain these, it is not a list of common passwords, whatever the server returned.
const CANARIES = ['123456', 'password'];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => {
  throw new Error(message);
};

function parseArgs(argv) {
  const source = argv.includes('--source') ? argv[argv.indexOf('--source') + 1] : DEFAULT_SOURCE;
  if (!source) fail('--source needs a URL');
  return { source, dryRun: argv.includes('--dry-run'), named: argv.includes('--source') };
}

function readEntries(body) {
  return body
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

/** Everything that must hold before the download is allowed anywhere near the current list. */
function validate(body) {
  if (body.includes('<html') || body.includes('<!DOCTYPE')) fail('the response is HTML, not a password list');
  const entries = readEntries(body);
  if (entries.length < MIN_ENTRIES) fail(`only ${entries.length} entries; expected at least ${MIN_ENTRIES}`);
  const tooLong = entries.find((entry) => entry.length > MAX_ENTRY_LENGTH);
  if (tooLong) fail(`entry longer than ${MAX_ENTRY_LENGTH} characters: ${tooLong.slice(0, 40)}...`);
  const missing = CANARIES.filter((canary) => !entries.includes(canary));
  if (missing.length) fail(`does not look like a password list: missing ${missing.join(', ')}`);
  return entries;
}

async function download(source) {
  const response = await fetch(source, { headers: { 'User-Agent': 'zitd-api blocklist updater' } });
  if (!response.ok) fail(`download failed with status ${response.status}`);
  return response.text();
}

function stamp(date) {
  return `${date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')}`;
}

function historyRow(manifest, change) {
  const when = manifest.installedAt.replace(/\.\d+Z$/, 'Z');
  return `| ${when} | ${manifest.entries} | ${change} | \`${manifest.sha256.slice(0, 16)}\` | ${manifest.source} |`;
}

function prepend(history, row) {
  const lines = history.split('\n');
  const header = lines.findIndex((line) => line.startsWith('| ---'));
  if (header < 0) fail('HISTORY.md has lost its table header');
  return [...lines.slice(0, header + 1), row, ...lines.slice(header + 1)].join('\n');
}

function check() {
  const manifest = JSON.parse(readFileSync(CURRENT_JSON, 'utf8'));
  const actual = sha256(readFileSync(CURRENT_TXT));
  if (actual !== manifest.sha256) {
    fail(`current.txt does not match its manifest\n  manifest: ${manifest.sha256}\n  actual:   ${actual}`);
  }
  console.log(`current.txt matches its manifest: ${manifest.entries} entries, sha256 ${manifest.sha256.slice(0, 16)}`);
}

async function update({ source, dryRun, named }) {
  const body = await download(source);
  const entries = validate(body);
  const normalized = `${entries.join('\n')}\n`;
  const digest = sha256(normalized);

  const previous = {
    txt: readFileSync(CURRENT_TXT),
    manifest: JSON.parse(readFileSync(CURRENT_JSON, 'utf8')),
    history: readFileSync(HISTORY, 'utf8'),
  };

  if (digest === previous.manifest.sha256) {
    console.log(`unchanged: the source still has the same ${entries.length} entries`);
    return;
  }
  if (dryRun) {
    console.log(`dry run: would install ${entries.length} entries (was ${previous.manifest.entries})`);
    return;
  }

  const now = new Date();
  const archivedTxt = path.join(ARCHIVE, `${stamp(now)}-${previous.manifest.sha256.slice(0, 8)}.txt`);
  const archivedJson = archivedTxt.replace(/\.txt$/, '.json');
  const written = [];

  try {
    mkdirSync(ARCHIVE, { recursive: true });
    writeFileSync(archivedTxt, previous.txt);
    written.push(archivedTxt);
    writeFileSync(archivedJson, `${JSON.stringify(previous.manifest, null, 2)}\n`);
    written.push(archivedJson);

    const manifest = {
      source: named ? source : DEFAULT_SOURCE_NAME,
      url: source,
      note: null,
      sha256: digest,
      entries: entries.length,
      installedAt: now.toISOString(),
      previousSha256: previous.manifest.sha256,
    };
    writeFileSync(CURRENT_TXT, normalized);
    writeFileSync(CURRENT_JSON, `${JSON.stringify(manifest, null, 2)}\n`);
    const delta = entries.length - previous.manifest.entries;
    const change = `${delta >= 0 ? '+' : ''}${delta}`;
    writeFileSync(HISTORY, prepend(previous.history, historyRow(manifest, change)));

    console.log(`installed ${entries.length} entries (${change}) from ${source}`);
    console.log(`archived the previous ${previous.manifest.entries} entries as ${path.basename(archivedTxt)}`);
  } catch (error) {
    writeFileSync(CURRENT_TXT, previous.txt);
    writeFileSync(CURRENT_JSON, `${JSON.stringify(previous.manifest, null, 2)}\n`);
    writeFileSync(HISTORY, previous.history);
    for (const file of written) if (existsSync(file)) rmSync(file);
    throw error;
  }
}

const argv = process.argv.slice(2);
try {
  if (argv.includes('--check')) check();
  else await update(parseArgs(argv));
} catch (error) {
  console.error(`blocklist update aborted, nothing changed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
