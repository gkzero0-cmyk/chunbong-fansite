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

assert.equal(archive._internals.normalizePublishedDate('2026-09-22T10:30:00+09:00'),'2026-09-22','ISO publication date should normalize to a day');
assert.equal(archive._internals.normalizePublishedDate('2026-02-31'),'','impossible publication dates must be rejected');
assert.equal(archive._internals.readPublishedDate('<meta property="article:published_time" content="2026-04-28T19:00:00+09:00">'),'2026-04-28','article publication metadata should be detected');
assert.equal(archive._internals.readPublishedDate('<script type="application/ld+json">{"@type":"VideoObject","uploadDate":"2026-06-24T18:00:00+09:00"}</script>'),'2026-06-24','JSON-LD upload dates should be detected');
assert.equal(archive._internals.readPublishedDate('<time datetime="2025-06-05T20:00:00+09:00">오픈</time>'),'2025-06-05','time datetime should be used as a fallback');
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


for(const token of ['별칭','결과 · 회차 기록','data-result-row','data-move-row','공개 페이지 열기','data-material-fetch-meta','원문 메타 가져오기','방통실 참가자 명단 미수집','FM코리아 참가자 명단 미수집','Notion 규칙·시스템 미구조화','SOOP 게시글 메타데이터 확인']) assert.ok(operatorContents.includes(token),token);
assert.match(operatorContents,/item\.aliases=/,'operator must collect aliases');
assert.match(operatorContents,/item\.results=/,'operator must collect results');

assert.match(operatorContents,/meta\.publishedDate/,'material source metadata should populate publication dates');
assert.match(operatorContents,/meta\.image/,'material source metadata should populate original thumbnails');
