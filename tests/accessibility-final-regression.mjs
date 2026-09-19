import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const page=read('page.js');
const media=read('page-media.js');
const sw=read('service-worker.js');

assert.match(page,/\$\$\('\[data-nav\]', nav\)\.forEach/,'navigation accessibility must iterate all primary links');
assert.ok(!page.includes("\n    $('[data-nav]', nav).forEach"),'single-element selector must not be used as a collection');
assert.match(page,/setAttribute\('aria-current', 'page'\)/,'active primary navigation must expose aria-current=page');
assert.match(page,/removeAttribute\('aria-current'\)/,'inactive primary navigation must clear aria-current');
assert.match(media,/setAttribute\('aria-busy','true'\)/,'media lists must announce loading');
assert.match(media,/setAttribute\('aria-busy','false'\)/,'media lists must clear loading after content resolves');
assert.match(sw,/chunbong-pwa-20260920-v14/,'PWA cache must advance for accessibility runtime changes');

console.log('accessibility final-pass regression passed');
