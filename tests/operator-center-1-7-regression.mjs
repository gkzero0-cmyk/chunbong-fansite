import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const contents=read('operator-contents.js');

assert.match(html,/data-archive-image-audit/,'image audit button missing');
assert.match(html,/data-archive-image-audit-state/,'image audit summary missing');
assert.match(html,/data-archive-image-audit-results/,'image audit results missing');
assert.match(html,/대표 이미지 · 갤러리 · 영상 썸네일/,'image audit scope description missing');

assert.match(contents,/IMAGE_AUDIT_LIMIT=80/,'image audit safety cap missing');
assert.match(contents,/IMAGE_AUDIT_LARGE_BYTES=1536\*1024/,'large image threshold missing');
assert.match(contents,/IMAGE_AUDIT_SLOW_MS=2500/,'slow image threshold missing');
assert.match(contents,/function collectArchiveImages/,'archive image collector missing');
assert.match(contents,/function imageLoad/,'real image load probe missing');
assert.match(contents,/method:'HEAD'/,'same-origin image size HEAD check missing');
assert.match(contents,/lowResolution/,'hero low-resolution check missing');
assert.match(contents,/function mapImageAudit/,'bounded image audit concurrency missing');
assert.match(contents,/function renderImageAudit/,'image audit renderer missing');
assert.match(contents,/function runImageAudit/,'image audit action missing');
assert.match(contents,/chunbong:operator-image-health/,'image audit event missing');
assert.match(contents,/data-archive-image-audit.*runImageAudit/,'image audit button binding missing');

assert.match(js,/currentImageHealth/,'operator image health state missing');
assert.match(js,/깨진 콘텐츠 이미지/,'broken image operator warning missing');
assert.match(js,/이미지 최적화 확인/,'large or slow image warning missing');
assert.match(js,/대표 이미지 해상도 확인/,'low-resolution hero warning missing');
assert.match(js,/chunbong:operator-image-health/,'image health listener missing');

assert.match(css,/Operator Center 1\.7/,'operator center 1.7 styles missing');
assert.match(css,/operator-image-audit-row/,'image audit issue row styles missing');
assert.match(css,/operator-image-audit-ok/,'image audit success state styles missing');

new Function(js);

console.log('operator center 1.7 image audit regression passed');
