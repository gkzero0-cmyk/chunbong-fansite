import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');
const content=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
assert.equal(typeof archive._internals.prepareForSave,'function','prepareForSave missing');
const base={id:'sample',title:'샘플',category:'minecraft',role:'주최',status:'ended',startDate:'2026-06',datePrecision:'month',summary:'설명',sources:[{id:'s1',kind:'official',url:'https://www.sooplive.com/station/chunbongtv'}],verification:{state:'official',conflicts:[]},published:false};
const draft=archive._internals.prepareForSave(base,{publish:false});
assert.equal(draft.item.published,false);
assert.throws(()=>archive._internals.prepareForSave({...base,sources:[]},{publish:true}),/published_source_required/);
assert.throws(()=>archive._internals.prepareForSave({...base,verification:{state:'needs_review',conflicts:[{field:'date'}]}},{publish:true}),/unresolved_conflict/);
for(const type of ['operator-content-archive','operator-content-archive-save','operator-content-archive-publish','operator-content-archive-delete']) assert.ok(content.includes(type),'missing '+type);
console.log('chunbong contents operator API regression passed');

const operatorHtml=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const operatorJs=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const operatorContents=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
assert.match(operatorHtml,/data-operator-tab="contents"/);
assert.match(operatorHtml,/data-operator-panel="contents"/);
assert.match(operatorHtml,/콘텐츠 아카이브/);
assert.match(operatorJs,/loadOperatorContents/);
for(const text of ['operator-content-archive','초안 저장','공개하기','정보 충돌','원문 URL']) assert.ok(operatorContents.includes(text),text);

assert.equal(typeof archive._internals.mergeArchiveRows,'function','seed/stored merge helper missing');
const seedPublished={...base,id:'leopel',title:'시드 레오펠',published:true};
const storedOther={...base,id:'other',title:'운영자 콘텐츠',published:true};
const storedOverride={...base,id:'leopel',title:'운영자 레오펠',published:true};
let merged=archive._internals.mergeArchiveRows([seedPublished],[storedOther]);
assert.deepEqual(merged.map(item=>item.id).sort(),['leopel','other'],'stored records must not hide verified seed records');
merged=archive._internals.mergeArchiveRows([seedPublished],[storedOverride]);
assert.equal(merged.find(item=>item.id==='leopel').title,'운영자 레오펠','stored published record should override the seed with the same id');
assert.match(String(archive._internals.DRAFT_PREFIX||''),/content-archive:draft:v1:/,'draft storage must be separate from public records');
assert.match(String(archive._internals.DRAFT_INDEX||''),/content-archive:draft-index:v1/,'draft index missing');

assert.match(String(archive._internals.HIDDEN_KEY||''),/content-archive:hidden:v1/,'hidden seed tombstone key missing');
assert.equal(typeof archive._internals.withoutHidden,'function','hidden seed filter helper missing');
assert.deepEqual(archive._internals.withoutHidden([seedPublished],['leopel']),[],'deleted seed content must stay hidden while storage is available');
const archiveSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
assert.match(archiveSource,/SADD['\",\s]+HIDDEN_KEY/,'delete must create a seed tombstone');
assert.match(archiveSource,/SREM['\",\s]+HIDDEN_KEY/,'publish must clear a seed tombstone');


for(const token of ['별칭','결과 · 회차 기록','data-result-row','data-move-row','공개 페이지 열기']) assert.ok(operatorContents.includes(token),token);
assert.match(operatorContents,/item\.aliases=/,'operator must collect aliases');
assert.match(operatorContents,/item\.results=/,'operator must collect results');
