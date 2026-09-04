import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = path.join(root, 'data', 'youtube-engagement-cache.json');
const updaterPath = path.join(root, 'scripts', 'update-youtube-engagement-cache.mjs');

assert.ok(fs.existsSync(cachePath), 'youtube engagement cache file must exist');
assert.ok(fs.existsSync(updaterPath), 'youtube engagement cache updater must exist');

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
assert.equal(cache.version, 1);
assert.ok(Array.isArray(cache.items));

const updater = fs.readFileSync(updaterPath, 'utf8');
assert.match(updater, /MAX_CONCURRENCY\s*=\s*6/);
assert.match(updater, /DISCOVERY_RETRY_ATTEMPTS\s*=\s*3/);
assert.match(updater, /async function withRetry/);
assert.match(updater, /fetchAllChannelItems/);
assert.match(updater, /withRetry\(\(\) => fetchAllChannelItems\('videos'\)/);
assert.match(updater, /withRetry\(\(\) => fetchAllChannelItems\('shorts'\)/);
assert.match(updater, /fetchWatchMetrics/);
assert.match(updater, /mergeEngagementCache/);
assert.match(updater, /previous\.items/);
assert.match(updater, /fresh\.items/);
assert.match(updater, /JSON\.stringify/);

console.log('YouTube engagement cache updater regression test passed');