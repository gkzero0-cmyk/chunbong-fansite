import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const page of ['vod.html', 'clips.html', 'youtube.html']) {
  const html = read(page);
  assert.match(html, /media-video-layout\.css\?v=2/, `${page} must bust the sticky media CSS cache`);
  assert.match(html, /page-media\.js\?v=2/, `${page} must bust the media runtime cache`);
}

const pageRuntime = read('page.js');
assert.match(pageRuntime, /fetch\('\/api\/version',[\s\S]*cache:'no-store'/, 'PWA worker version must come from the uncached deployment SHA');
assert.match(pageRuntime, /service-worker\.js\?v='\+encodeURIComponent\(version\)/, 'service worker cache generation must follow deployment SHA');
assert.match(pageRuntime, /updateViaCache:\s*'none'/, 'service worker script must bypass HTTP cache when checking a new deployment');

const require = createRequire(import.meta.url);
const { normalizeSoopVideo } = require('../lib/content-api/soop-video-normalize.js');
const vodFromLink = normalizeSoopVideo({ url: 'https://vod.sooplive.co.kr/player/181181967?change_second=636' }, 'vod');
assert.equal(vodFromLink.id, '181181967', 'SOOP VOD id must be recovered from an explicit player URL');
assert.match(vodFromLink.embed, /\/player\/181181967\/embed/);

const catchFromLink = normalizeSoopVideo({ linkUrl: 'https://vod.sooplive.com/player/193268691/catch' }, 'catch');
assert.equal(catchFromLink.id, '193268691', 'SOOP Catch id must be recovered from an explicit player URL');
assert.match(catchFromLink.embed, /\/player\/193268691\/embed\?type=catch/);

console.log('media cache refresh regression passed');
