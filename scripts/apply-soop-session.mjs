import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { upsertSession } = require('../lib/soop-analytics.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORE = path.join(__dirname, '..', 'data', 'soop-sessions.json');

export function applySessionStore(store, session) {
  return upsertSession(store, session);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

async function main() {
  const input = process.env.SOOP_SESSION_INPUT || path.join(__dirname, '..', 'data', 'soop-final-session.json');
  const storePath = process.env.SOOP_SESSION_STORE || DEFAULT_STORE;
  const session = readJson(input, null);
  if (!session?.id) {
    console.log('SOOP_SESSION_CHANGED=0');
    return;
  }
  const before = readJson(storePath, { version: 1, sessions: [] });
  const after = applySessionStore(before, session);
  const beforeText = `${JSON.stringify(before, null, 2)}\n`;
  const afterText = `${JSON.stringify(after, null, 2)}\n`;
  if (beforeText === afterText) {
    console.log('SOOP_SESSION_CHANGED=0');
    return;
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, afterText);
  console.log('SOOP_SESSION_CHANGED=1');
  console.log(`SOOP_SESSION_ID=${session.id}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
