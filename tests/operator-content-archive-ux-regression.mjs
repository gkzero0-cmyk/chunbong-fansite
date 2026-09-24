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
assert.match(operator,/외부 공개 권한을 확인했다면 계속하세요/,'restricted SOOP publication must require an explicit operator confirmation');
assert.doesNotMatch(operator,/비로그인 일반 공개로 확인된 뒤에 공개할 수 있습니다/,'restricted SOOP public button must not remain disabled');
assert.match(html,/자동 공개하지 않고 운영자 승인 시에만 공개/,'operator policy copy must distinguish automatic and manual publication');

console.log('operator content archive UX regression passed');
