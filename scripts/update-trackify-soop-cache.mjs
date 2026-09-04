import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const {
  fetchTrackifySoopHistory,
  extractExternalSoopStatsFromHtml,
  mergeTrackifySessions
} = require('../lib/soop-external.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'data', 'trackify-soop-cache.json');

function meaningful(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return value && typeof value === 'object';
}

function mergeLastGoodObject(previous = {}, fresh = {}) {
  const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
  const incoming = fresh && typeof fresh === 'object' && !Array.isArray(fresh) ? fresh : {};
  const result = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (meaningful(value) || (typeof value === 'number' && value === 0)) result[key] = value;
  }
  return result;
}

export function buildTrackifyCache(previous = {}, fresh = {}, now = new Date()) {
  const previousSessions = Array.isArray(previous?.sessions) ? previous.sessions : [];
  const freshSessions = Array.isArray(fresh?.sessions) ? fresh.sessions : [];
  const sessions = mergeTrackifySessions(previousSessions, freshSessions);
  const previousStats = previous?.stats && typeof previous.stats === 'object' ? previous.stats : {};
  const freshStats = fresh?.stats && typeof fresh.stats === 'object' ? fresh.stats : {};
  const stats = mergeLastGoodObject(previousStats, freshStats);
  const hasFresh = Object.values(freshStats).some(meaningful) || freshSessions.length > 0;
  return {
    version: Number(previous?.version) || 1,
    capturedAt: hasFresh ? now.toISOString() : String(previous?.capturedAt || ''),
    stats: Object.keys(stats).length ? stats : null,
    sessions
  };
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); }
  catch (_) { return { version: 1, capturedAt: '', stats: null, sessions: [] }; }
}

async function main() {
  const previous = readCache();
  const history = await fetchTrackifySoopHistory({ maxBroadcasts: 240, maxPages: 20 });
  const freshStats = history.profileHtml
    ? extractExternalSoopStatsFromHtml(history.profileHtml, 'trackify')
    : null;
  const next = buildTrackifyCache(previous, { stats: freshStats, sessions: history.sessions }, new Date());

  if (!next.sessions.length && !next.stats) {
    throw new Error(`Trackify returned no usable data (${history.errors?.length || 0} fetch errors)`);
  }

  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`TRACKIFY_PROFILE_BYTES=${history.profileHtml?.length || 0}`);
  console.log(`TRACKIFY_BROADCAST_LINKS=${history.broadcastLinks?.length || 0}`);
  console.log(`TRACKIFY_NEW_SESSIONS=${history.sessions?.length || 0}`);
  console.log(`TRACKIFY_CACHED_SESSIONS=${next.sessions.length}`);
  console.log(`TRACKIFY_FETCH_ERRORS=${history.errors?.length || 0}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
