import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const operator=read('operator-contents.js');
const html=read('operator.html');
const css=read('operator.css');
const api=read('lib/chunbong-content-archive-api.js');

assert.doesNotThrow(()=>new Function(operator.replace(/\bexport\s+(?=(?:async\s+)?function|const|let|var|class)/g,'')),'operator content script must parse');
assert.doesNotThrow(()=>new Function(api),'content archive API must parse');

const invalidLoops=operator.split('\n').filter(line=>/\$\([^)]*\)\.forEach/.test(line)&&!/\$\$\(/.test(line));
assert.deepEqual(invalidLoops,[],'querySelector result must not be treated as a NodeList');

assert.match(html,/오늘 처리할 일/,'operator archive must expose action-first task dashboard');
assert.match(operator,/state==='attention'&&row\.state!=='unlinked'/,'internal completed imports must not count as attention');
assert.match(operator,/runBulkAutoEnhance/,'bulk auto enhancement must exist');
assert.match(operator,/runSelectedAutoEnhance/,'per-content auto enhancement must exist');
assert.match(operator,/beforeunload/,'unsaved archive edits must be protected');
assert.match(operator,/confirmDiscardChanges/,'switching content must guard unsaved edits');
assert.match(html,/data-archive-load-retry/,'archive load failure must provide retry');
assert.match(operator,/markArchiveHealthUnavailable/,'load failures must not leave ambiguous dash counters');
assert.match(css,/operator-archive-technical-field/,'technical fields must be hideable');
assert.match(operator,/operator-archive-issue-chip/,'content list must expose issue shortcuts');

assert.match(api,/operatorOverride&&payload\?\.source==='soop-authenticated-browser'/,'owner must be able to publish authenticated SOOP imports manually');
assert.match(operator,/공개 가능 여부를 확인했다면 계속하세요/,'subscriber/private SOOP publication must require an explicit operator confirmation');
assert.doesNotMatch(operator,/비로그인 일반 공개로 확인된 뒤에 공개할 수 있습니다/,'restricted SOOP public button must not remain disabled');
assert.match(html,/SOOP 일반 공개글과 <b>애청자 글은 자동 수집 → 자동 매칭 → 자동 공개<\/b>/,'operator policy copy must auto-publish favorite posts');
assert.match(html,/구독자 전용·비공개·기타 로그인 제한 글은 내부 자료로 저장하고 운영자 확인 후에만 공개/,'operator policy copy must keep restricted SOOP publication review-gated');

console.log('operator content archive UX regression passed');
