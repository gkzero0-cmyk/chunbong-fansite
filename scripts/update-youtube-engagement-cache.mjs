import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  fetchAllChannelItems,
  fetchWatchMetrics,
  CHANNEL
} = require('../lib/content-api/youtube');
const {
  mergeEngagementCache,
  normalizeEngagementItem
} = require('../lib/youtube-engagement');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = path.join(root, 'data', 'youtube-engagement-cache.json');
const MAX_CONCURRENCY = 4;
const DAILY_RECENT_LIMIT = 30;
const STALE_REFRESH_LIMIT = 20;
const MAX_DISCOVERY_PAGES = 6;
const DISCOVERY_RETRY_ATTEMPTS = 3;
const DISCOVERY_RETRY_DELAY_MS = 1000;

function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return parsed && Array.isArray(parsed.items)
      ? parsed
      : { version: 1, capturedAt: '', source: CHANNEL, itemCount: 0, items: [] };
  } catch (_) {
    return { version: 1, capturedAt: '', source: CHANNEL, itemCount: 0, items: [] };
  }
}

function newestCheckpoint(items, kind) {
  return [...items]
    .filter(item => item?.kind === kind && item?.id)
    .sort((a,b)=>(Date.parse(b.publishedAt||'')||0)-(Date.parse(a.publishedAt||'')||0))[0]?.id || '';
}

function refreshIntervalMs(item, nowMs = Date.now()) {
  const published = Date.parse(item?.publishedAt || '');
  const ageDays = Number.isFinite(published) ? Math.max(0, (nowMs - published) / 86400000) : 9999;
  if (ageDays <= 30) return 24 * 60 * 60 * 1000;
  if (ageDays <= 180) return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

function dueForMetricRefresh(item, nowMs = Date.now()) {
  const checked = Date.parse(item?.metricCheckedAt || '');
  if (!Number.isFinite(checked)) return true;
  return nowMs - checked >= refreshIntervalMs(item, nowMs);
}

function dedupe(items) {
  const byId = new Map();
  for (const raw of items) {
    const item = normalizeEngagementItem({
      ...raw,
      publishedAt: raw?.dateIso || raw?.publishedAt || '',
      viewCount: raw?.viewCount ?? null,
      commentCount: raw?.commentCount ?? null
    });
    if (!item) continue;
    const previous = byId.get(item.id);
    byId.set(item.id, previous ? {
      ...previous,
      ...item,
      kind: previous.kind === 'shorts' || item.kind === 'shorts' ? 'shorts' : 'videos',
      publishedAt: item.publishedAt || previous.publishedAt,
      viewCount: Number.isFinite(item.viewCount) ? item.viewCount : previous.viewCount,
      commentCount: Number.isFinite(item.commentCount) ? item.commentCount : previous.commentCount
    } : item);
  }
  return [...byId.values()];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(task, attempts = DISCOVERY_RETRY_ATTEMPTS) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      const delay = DISCOVERY_RETRY_DELAY_MS * attempt;
      console.warn(`YouTube discovery attempt ${attempt}/${attempts} failed: ${error?.message || error}; retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError || new Error('YouTube discovery failed');
}

async function mapLimit(items, limit, mapper) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await mapper(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(Math.max(1, limit), Math.max(1, items.length)) }, () => worker());
  await Promise.all(workers);
  return out;
}

const previous = readCache();
const videoCheckpoint = newestCheckpoint(previous.items, 'videos');
const shortsCheckpoint = newestCheckpoint(previous.items, 'shorts');
let videos=[],shorts=[];
try{
  [videos, shorts] = await Promise.all([
    withRetry(() => fetchAllChannelItems('videos', { maxPages: MAX_DISCOVERY_PAGES, stopId: videoCheckpoint })),
    withRetry(() => fetchAllChannelItems('shorts', { maxPages: MAX_DISCOVERY_PAGES, stopId: shortsCheckpoint }))
  ]);
}catch(error){
  if(previous.items.length){
    console.warn(`YouTube discovery unavailable; preserving ${previous.items.length} cached items: ${error?.message||error}`);
    process.exit(0);
  }
  throw error;
}
const discovered = dedupe([...videos, ...shorts]);

if (!discovered.length) {
  if (previous.items.length) {
    console.log(`YouTube engagement refresh returned no items; preserving ${previous.items.length} cached items`);
    process.exit(0);
  }
  throw new Error('YouTube engagement refresh returned no public content');
}

const previousById = new Map(previous.items.map(item => [item.id, item]));
const discoveredById = new Map(discovered.map(item => [item.id, item]));
const nowMs = Date.now();
const latestKnown = [...previous.items, ...discovered]
  .filter(item => item?.id)
  .sort((a,b)=>(Date.parse(b.publishedAt||'')||0)-(Date.parse(a.publishedAt||'')||0));
const recentIds = new Set(latestKnown.slice(0, DAILY_RECENT_LIMIT).map(item => item.id));
const staleIds = latestKnown
  .filter(item => !recentIds.has(item.id) && dueForMetricRefresh(item, nowMs))
  .slice(0, STALE_REFRESH_LIMIT)
  .map(item => item.id);
const metricIds = [...new Set([...recentIds, ...staleIds])];
const metricTargets = metricIds.map(id => discoveredById.get(id) || previousById.get(id)).filter(Boolean);

let metricErrors = 0;
const refreshedItems = await mapLimit(metricTargets, MAX_CONCURRENCY, async item => {
  try {
    const metrics = await fetchWatchMetrics(item.id);
    return {
      ...item,
      publishedAt: metrics.publishedAt || item.publishedAt || '',
      viewCount: Number.isFinite(metrics.viewCount) ? metrics.viewCount : item.viewCount,
      commentCount: Number.isFinite(metrics.commentCount) ? metrics.commentCount : item.commentCount,
      metricCheckedAt: new Date().toISOString()
    };
  } catch (error) {
    metricErrors += 1;
    return { ...item };
  }
});
const refreshedById = new Map(refreshedItems.map(item => [item.id, item]));
const freshItems = discovered.map(item => refreshedById.get(item.id) || item);
for (const item of refreshedItems) {
  if (!discoveredById.has(item.id)) freshItems.push(item);
}

const fresh = {
  version: 1,
  capturedAt: new Date().toISOString(),
  source: CHANNEL,
  items: freshItems
};

if (!fresh.items.length && previous.items.length) {
  console.log(`No fresh YouTube engagement rows; preserving ${previous.items.length} cached rows`);
  process.exit(0);
}

const merged = mergeEngagementCache(previous, fresh);
if (!merged.items.length) throw new Error('Refusing to write an empty YouTube engagement cache');

const tmpPath = `${cachePath}.tmp`;
fs.writeFileSync(tmpPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
fs.renameSync(tmpPath, cachePath);

const views = merged.items.filter(item => Number.isFinite(item.viewCount)).length;
const comments = merged.items.filter(item => Number.isFinite(item.commentCount)).length;
console.log(`YOUTUBE_ENGAGEMENT_DISCOVERED=${discovered.length}`);
console.log(`YOUTUBE_ENGAGEMENT_CACHED=${merged.items.length}`);
console.log(`YOUTUBE_ENGAGEMENT_VIEWS=${views}`);
console.log(`YOUTUBE_ENGAGEMENT_COMMENTS=${comments}`);
console.log(`YOUTUBE_ENGAGEMENT_METRIC_REFRESHED=${metricTargets.length}`);
console.log(`YOUTUBE_ENGAGEMENT_METRIC_ERRORS=${metricErrors}`);
console.log(`YOUTUBE_ENGAGEMENT_VIDEO_CHECKPOINT=${videoCheckpoint}`);
console.log(`YOUTUBE_ENGAGEMENT_SHORTS_CHECKPOINT=${shortsCheckpoint}`);
