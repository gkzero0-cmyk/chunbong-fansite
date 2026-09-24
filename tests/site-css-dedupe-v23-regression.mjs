import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const mobile=read('mobile-site.css');
const contents=read('chunbong-contents.css');
const operator=read('operator.css');

assert.equal((mobile.match(/\.pwa-app-mode \.site-header\.pwa-compact-header \.nav-toggle,/g)||[]).length,1,'PWA compact-header hide rule must exist only once');
assert.doesNotMatch(contents,/archive-series-card-visual:not\(\.is-multi\) \.archive-series-card-image img\{object-fit:cover\}/,'dead cover rule must stay removed');
assert.match(contents,/\.archive-series-card-visual:not\(\.is-multi\) \.archive-series-card-image img,\s*\.archive-card-media img,\s*\.archive-detail-media img,\s*\.archive-series-poster img\{object-fit:contain\}/,'unified archive media contain rule must remain');
assert.equal((contents.match(/\.archive-knowledge-block\{margin-top:22px;padding-top:18px;border-top:1px solid #252525\}/g)||[]).length,1,'knowledge block base rule must exist only once');
assert.equal((contents.match(/\.archive-detail-hero\{align-items:start\}/g)||[]).length,1,'detail hero start alignment should remain only in the mobile override');
assert.match(contents,/@media\(min-width:761px\)\{\s*\.archive-detail-hero\{align-items:stretch\}/,'desktop detail hero stretch must remain');
assert.equal((operator.match(/\.operator-feedback-filters input\{grid-column:1\/-1\}/g)||[]).length,2,'operator input grid rule should remain once for base and once for mobile refinement');

assert.ok(Buffer.byteLength(mobile,'utf8')<73000,'mobile-site.css must stay below 73KB source budget');
assert.ok(Buffer.byteLength(contents,'utf8')<70000,'chunbong-contents.css must stay below 70KB source budget');
assert.ok(Buffer.byteLength(operator,'utf8')<81000,'operator.css must stay below 81KB source budget');

// deployment-sync:v23
console.log('site CSS dedupe v23 regression passed');
