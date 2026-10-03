import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const api=require('../chunbong-contents.js');

assert.equal(typeof api.postCanonicalKey,'function','postCanonicalKey must be exported');
assert.equal(typeof api.mergePostRows,'function','mergePostRows must be exported');
assert.equal(typeof api.normalizePostRows,'function','normalizePostRows must be exported');

const soopBase='https://www.sooplive.com/station/chunbongtv/post/208562045';
assert.equal(api.postCanonicalKey({url:soopBase}), 'soop:208562045');
assert.equal(api.postCanonicalKey({url:soopBase+'/?from=share#reply'}), 'soop:208562045');

const item={
  timeline:[
    {id:'unknown',type:'post',title:'공식 게시글 · 208562045',date:'',datePrecision:'unknown',url:soopBase,note:'placeholder'},
    {id:'older',type:'post',title:'9월 공지',date:'2026-09-23',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/207000001'},
    {id:'newer-a',type:'post',title:'10월 공지 A',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208600001'},
    {id:'url-less-a',type:'reference',title:'게시글',date:'',datePrecision:'unknown',url:'',note:'A'},
    {id:'url-less-b',type:'reference',title:'게시글',date:'',datePrecision:'unknown',url:'',note:'B'}
  ],
  media:[
    {id:'duplicate-better',type:'post',title:'적자생존 2차 입주 안내',date:'2026-09-30',datePrecision:'day',url:soopBase+'?share=1'},
    {id:'newer-b',type:'post',title:'10월 공지 B',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208700001'},
    {id:'video-ignore',type:'vod',title:'VOD',date:'2026-10-02',datePrecision:'day',url:'https://vod.sooplive.com/player/1'}
  ]
};

const rows=api.normalizePostRows(item);
assert.equal(rows.length,6,'timeline/media duplicate must collapse while unrelated URL-less rows remain separate');
assert.deepEqual(rows.slice(0,4).map(row=>row.id),['newer-b','newer-a','duplicate-better','older'],'known dates must be newest-first with same-day SOOP ids descending');
assert.equal(rows[2].title,'적자생존 2차 입주 안내','specific duplicate title must beat placeholder title');
assert.equal(rows[2].date,'2026-09-30','day-precision duplicate date must beat unknown date');
assert.equal(rows[2].datePrecision,'day');
assert.equal(rows[4].datePrecision,'unknown');
assert.equal(rows[5].datePrecision,'unknown');
assert.notEqual(api.postCanonicalKey(rows[4]),api.postCanonicalKey(rows[5]),'unrelated URL-less rows must not over-merge');

const genericUrlA=api.postCanonicalKey({url:'https://example.com/post/abc?utm_source=x#frag'});
const genericUrlB=api.postCanonicalKey({url:'https://example.com/post/abc?utm_source=y'});
assert.equal(genericUrlA,genericUrlB,'non-SOOP canonical keys must ignore query/hash noise');

const merged=api.mergePostRows(
  {id:'x',type:'post',title:'게시글',date:'',datePrecision:'unknown',url:soopBase},
  {id:'y',type:'post',title:'구체적인 모집 공지',date:'2026-09-30',datePrecision:'day',url:soopBase+'?from=share'}
);
assert.equal(merged.title,'구체적인 모집 공지');
assert.equal(merged.date,'2026-09-30');
assert.equal(merged.datePrecision,'day');

console.log('chunbong post normalization regression passed');
