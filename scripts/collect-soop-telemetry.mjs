import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { finalizeSession } = require('../lib/soop-analytics.js');
const { fetchSoopLive, fetchSoopChannelProfile } = require('../lib/chunbong-data.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATE = path.join(__dirname, '..', 'data', 'soop-live-state.json');

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSample(sample = {}) {
  return {
    capturedAt: sample.capturedAt || new Date().toISOString(),
    live: sample.live ?? null,
    startedAt: sample.startedAt || '',
    title: sample.title || '',
    viewerCount: numberOrNull(sample.viewerCount),
    categoryId: sample.categoryId ? String(sample.categoryId) : '',
    categoryName: sample.categoryName || '',
    followerCount: numberOrNull(sample.followerCount),
    fanclubCount: numberOrNull(sample.fanclubCount)
  };
}

function profileFromSample(sample, previous = null) {
  const followerCount = numberOrNull(sample?.followerCount);
  const fanclubCount = numberOrNull(sample?.fanclubCount);
  if (followerCount === null && fanclubCount === null) return previous || null;
  return {
    capturedAt: sample.capturedAt,
    followerCount: followerCount !== null ? followerCount : numberOrNull(previous?.followerCount),
    fanclubCount: fanclubCount !== null ? fanclubCount : numberOrNull(previous?.fanclubCount)
  };
}

function upsertSample(samples, sample, limit = 1000) {
  const map = new Map();
  for (const item of Array.isArray(samples) ? samples : []) {
    if (item?.capturedAt) map.set(String(item.capturedAt), item);
  }
  map.set(String(sample.capturedAt), sample);
  return [...map.values()]
    .sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)))
    .slice(-Math.max(1, limit));
}

export function advanceTelemetry(previousState = {}, rawSample = {}) {
  const sample = normalizeSample(rawSample);
  const previousSession = previousState?.session?.active ? previousState.session : null;
  const next = {
    version: Number(previousState?.version) || 1,
    session: previousSession ? { ...previousSession, samples: [...(previousSession.samples || [])] } : null,
    lastProfile: profileFromSample(sample, previousState?.lastProfile || null)
  };
  let finalizedSession = null;

  if (sample.live === true) {
    if (!next.session) {
      const sessionId = sample.startedAt || sample.capturedAt;
      next.session = {
        active: true,
        sessionId,
        startedAt: sample.startedAt || sample.capturedAt,
        title: sample.title || '',
        samples: []
      };
    }
    next.session.title = sample.title || next.session.title || '';
    next.session.samples = upsertSample(next.session.samples, sample);
    return { state: next, finalizedSession: null };
  }

  if (sample.live === false && next.session) {
    finalizedSession = finalizeSession({ version: next.version, session: next.session }, sample.capturedAt);
    next.session = null;
  }

  return { state: next, finalizedSession };
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function collectPublicSample(now = new Date()) {
  const capturedAt = now.toISOString();
  const [liveResult, profileResult] = await Promise.allSettled([fetchSoopLive(), fetchSoopChannelProfile()]);
  const live = liveResult.status === 'fulfilled'
    ? liveResult.value
    : { live: null, title: '', startedAt: '', viewerCount: null, categoryId: '', categoryName: '', followerCount: null, fanclubCount: null };
  const profile = profileResult.status === 'fulfilled'
    ? profileResult.value
    : { followerCount: null, fanclubCount: null, categoryId: '', categoryName: '' };
  return normalizeSample({
    ...live,
    capturedAt,
    categoryId: live.categoryId || profile.categoryId || '',
    categoryName: live.categoryName || profile.categoryName || '',
    followerCount: numberOrNull(live.followerCount) ?? numberOrNull(profile.followerCount),
    fanclubCount: numberOrNull(live.fanclubCount) ?? numberOrNull(profile.fanclubCount)
  });
}

async function main() {
  const input = process.env.SOOP_STATE_PATH || DEFAULT_STATE;
  const output = process.env.SOOP_NEXT_STATE_PATH || input;
  const finalOutput = process.env.SOOP_FINAL_SESSION_PATH || path.join(path.dirname(output), 'soop-final-session.json');
  const previous = readJson(input, { version: 1, session: null, lastProfile: null });
  const sample = await collectPublicSample();
  const result = advanceTelemetry(previous, sample);
  writeJson(output, result.state);
  writeJson(finalOutput, result.finalizedSession);
  console.log(`SOOP_TELEMETRY_LIVE=${sample.live}`);
  console.log(`SOOP_TELEMETRY_VIEWERS=${sample.viewerCount ?? ''}`);
  console.log(`SOOP_TELEMETRY_FOLLOWERS=${sample.followerCount ?? ''}`);
  console.log(`SOOP_TELEMETRY_FANCLUB=${sample.fanclubCount ?? ''}`);
  console.log(`SOOP_TELEMETRY_FINALIZED=${result.finalizedSession ? 1 : 0}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
