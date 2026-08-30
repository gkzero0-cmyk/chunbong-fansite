import fs from 'node:fs';
import assert from 'node:assert/strict';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
assert.notEqual(config.cleanUrls, true, 'plain static HTML site must not force cleanUrls redirects');
assert.equal(config.trailingSlash, undefined, 'plain static HTML site must not force trailing-slash redirects');
for (const page of ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html']) {
  assert.ok(fs.existsSync(new URL(`../${page}`, import.meta.url)), `${page} must exist as a direct static target`);
}
console.log('redirect loop regression: ok');
