import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const {
  fetchTrackifySoopHistory,
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

export function historyToFreshCache(history = {}) {
  return {
    stats: history?.stats && typeof history.stats === 'object' && !Array.isArray(history.stats) ? history.stats : null,
    sessions: Array.isArray(history?.sessions) ? history.sessions : []
  };
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

export function incrementalFrom(previous = {}, now = new Date()) {
  const latest = (Array.isArray(previous?.sessions) ? previous.sessions : [])
    .map(session => Date.parse(session?.startedAt || session?.date || ''))
    .filter(Number.isFinite)
    .sort((a,b)=>b-a)[0];
  if (!Number.isFinite(latest)) return '';
  const overlap = new Date(latest - 2 * 86400000);
  return overlap.toISOString().slice(0, 10);
}

async function main() {
  const previous = readCache();
  const from = incrementalFrom(previous, new Date());
  let history;
  try{
    history = await fetchTrackifySoopHistory({ from: from || undefined, maxBroadcasts: 120, maxPages: 4, pageSize: 30 });
  }catch(error){
    if((Array.isArray(previous.sessions)&&previous.sessions.length)||previous.stats){
      console.warn(`Trackify unavailable; preserving cached data: ${error?.message||error}`);
      return;
    }
    throw error;
  }
  const fresh = historyToFreshCache(history);
  const next = buildTrackifyCache(previous, fresh, new Date());

  if (!next.sessions.length && !next.stats) {
    throw new Error(`Trackify returned no usable data (${history.errors?.length || 0} fetch errors)`);
  }

  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`TRACKIFY_STATS=${fresh.stats ? 1 : 0}`);
  console.log(`TRACKIFY_BROADCAST_LINKS=${history.broadcastLinks?.length || 0}`);
  console.log(`TRACKIFY_NEW_SESSIONS=${history.sessions?.length || 0}`);
  console.log(`TRACKIFY_CACHED_SESSIONS=${next.sessions.length}`);
  console.log(`TRACKIFY_FETCH_ERRORS=${history.errors?.length || 0}`);
  console.log(`TRACKIFY_INCREMENTAL_FROM=${from || 'bootstrap'}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
