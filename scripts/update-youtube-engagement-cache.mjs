import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  fetchAllChannelItems,
  fetchWatchMetrics,
  CHANNEL
} = require('../api/youtube');
const {
  mergeEngagementCache,
  normalizeEngagementItem
} = require('../lib/youtube-engagement');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = path.join(root, 'data', 'youtube-engagement-cache.json');
const MAX_CONCURRENCY = 6;

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
const [videos, shorts] = await Promise.all([
  fetchAllChannelItems('videos'),
  fetchAllChannelItems('shorts')
]);
const discovered = dedupe([...videos, ...shorts]);

if (!discovered.length) {
  if (previous.items.length) {
    console.log(`YouTube engagement refresh returned no items; preserving ${previous.items.length} cached items`);
    process.exit(0);
  }
  throw new Error('YouTube engagement refresh returned no public content');
}

let metricErrors = 0;
const freshItems = await mapLimit(discovered, MAX_CONCURRENCY, async item => {
  try {
    const metrics = await fetchWatchMetrics(item.id);
    return {
      ...item,
      publishedAt: metrics.publishedAt || item.publishedAt || '',
      viewCount: Number.isFinite(metrics.viewCount) ? metrics.viewCount : item.viewCount,
      commentCount: Number.isFinite(metrics.commentCount) ? metrics.commentCount : null
    };
  } catch (error) {
    metricErrors += 1;
    return { ...item };
  }
});

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
console.log(`YOUTUBE_ENGAGEMENT_METRIC_ERRORS=${metricErrors}`);
