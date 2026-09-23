import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const contents=read('operator-contents.js');

for(const id of ['archive-health-total','archive-health-issues','archive-health-visual','archive-health-candidates'])assert.match(html,new RegExp(id),'content health card missing: '+id);
assert.match(html,/콘텐츠 아카이브 상태/);
assert.match(html,/자료 보강 필요/);
assert.match(html,/이미지 · 썸네일/);
assert.match(html,/자동수집 검토/);

assert.match(contents,/export function archiveAudit/,'archive audit must be reusable');
assert.match(contents,/function archiveHealthSnapshot/,'archive health snapshot missing');
assert.match(contents,/visualIssueItemCount/,'visual issue summary missing');
assert.match(contents,/syncFailed/,'auto-sync failure summary missing');
assert.match(contents,/topIssues/,'top content issues summary missing');
assert.match(contents,/export async function fetchOperatorContentHealth/,'overview health loader missing');
assert.match(contents,/chunbong:operator-archive-health/,'archive health event missing');
assert.match(contents,/publishArchiveHealth\(archiveHealthSnapshot/,'archive health must refresh after content reload');

assert.match(js,/currentArchiveHealth/,'operator overview archive state missing');
assert.match(js,/function loadArchiveHealth/,'archive health boot loader missing');
assert.match(js,/콘텐츠 자동수집 실패/,'archive sync failure attention missing');
assert.match(js,/콘텐츠 자료 보강/,'archive quality attention missing');
assert.match(js,/자동수집 검토 후보/,'archive candidate attention missing');
assert.match(js,/chunbong:operator-archive-health/,'live archive health listener missing');
assert.match(js,/loadSystemStatus\(\),loadArchiveHealth\(\)/,'archive health must load with dashboard');

assert.match(css,/Operator Center 1\.5/,'operator center 1.5 styles missing');
assert.match(css,/operator-archive-summary/,'archive health summary layout missing');

new Function(js);

console.log('operator center 1.5 content health regression passed');
