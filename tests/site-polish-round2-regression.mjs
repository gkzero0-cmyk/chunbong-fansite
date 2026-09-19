import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const home = read('index.html');
const history = read('history.html');
const data = read('data.html');
const youtube = read('youtube.html');
const homeOverview = read('home-overview.js');
const serviceWorker = read('service-worker.js');
const workflow = read('.github/workflows/production-version-sync.yml');
const versionApi = read('api/version.js');

assert.match(history, /09 \/ BROADCAST HISTORY/, 'history portal number must be 09');
assert.match(data, /10 \/ DATA/, 'data portal number must be 10');
assert.match(home, /TODAY · CHUNBONG/, 'home today overview missing');
assert.match(home, /home-overview\.css/, 'home overview stylesheet missing');
assert.match(home, /home-overview\.js/, 'home overview runtime missing');
assert.match(homeOverview, /get\('schedule'\)/, 'home overview must reuse schedule API');
assert.match(homeOverview, /get\('activity'\)/, 'home overview must reuse activity API');
assert.doesNotMatch(youtube, /data-youtube-count="videos">0</, 'video count must not flash zero before load');
assert.doesNotMatch(youtube, /data-youtube-count="shorts">0</, 'shorts count must not flash zero before load');
assert.match(youtube, /data-youtube-count="videos" aria-live="polite">…</);
assert.match(versionApi, /VERCEL_GIT_COMMIT_SHA/, 'version endpoint must expose deployment commit');
assert.match(versionApi, /no-store/, 'version endpoint must not be cached');
assert.match(workflow, /api\/version/, 'production sync workflow must query version endpoint');
assert.match(workflow, /git rev-parse HEAD/, 'production sync workflow must compare against checked-out main');
assert.match(serviceWorker, /home-overview\.css/);
assert.match(serviceWorker, /home-overview\.js/);

console.log('site polish round 2 regression passed');
