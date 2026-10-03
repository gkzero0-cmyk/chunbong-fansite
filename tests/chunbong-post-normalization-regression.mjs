import assert from 'node:assert/strict';
import api from '../chunbong-contents.js';

assert.equal(typeof api.postCanonicalKey,'function','postCanonicalKey should be exported');
assert.equal(typeof api.mergePostRows,'function','mergePostRows should be exported');
assert.equal(typeof api.normalizePostRows,'function','normalizePostRows should be exported');

const item={
  timeline:[
    {id:'old',type:'post',title:'공식 게시글 · 208000001',date:'2026-09-23',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208000001'},
    {id:'dup-timeline',type:'post',title:'공식 게시글 · 208562045',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/208562045?from=board#reply'},
    {id:'same-day-low',type:'post',title:'낮은 번호',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208600001'},
    {id:'same-day-high',type:'post',title:'높은 번호',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208600099/'},
    {id:'url-less-a',type:'reference',title:'게시글',date:'',datePrecision:'unknown',url:''},
    {id:'url-less-b',type:'reference',title:'게시글',date:'',datePrecision:'unknown',url:''}
  ],
  media:[
    {id:'dup-media',type:'post',title:'적자생존 2차 입주 안내',date:'2026-09-30',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562045/'},
    {id:'ignored-vod',type:'vod',title:'영상',date:'2026-10-02',datePrecision:'day',url:'https://vod.sooplive.com/player/1'}
  ]
};

const rows=api.normalizePostRows(item);
assert.equal(rows.length,6,'duplicate SOOP variants should collapse and VOD should be excluded');
assert.deepEqual(rows.slice(0,4).map(row=>row.url),[
  'https://www.sooplive.com/station/chunbongtv/post/208600099/',
  'https://www.sooplive.com/station/chunbongtv/post/208600001',
  'https://www.sooplive.com/station/chunbongtv/post/208562045/',
  'https://www.sooplive.com/station/chunbongtv/post/208000001'
],'known dates should sort newest first with same-day SOOP post id descending');
assert.equal(rows[2].title,'적자생존 2차 입주 안내','specific duplicate title should beat placeholder title');
assert.equal(rows[2].date,'2026-09-30','more precise duplicate date should be preserved');
assert.equal(rows[2].datePrecision,'day');
assert.equal(api.postCanonicalKey({url:'https://www.sooplive.com/station/chunbongtv/post/208562045/?x=1#y'}),'soop:208562045');
assert.notEqual(api.postCanonicalKey(item.timeline[4]),api.postCanonicalKey(item.timeline[5]),'unrelated URL-less rows must not over-merge');
assert.ok(rows.slice(4).every(row=>!row.date||row.datePrecision==='unknown'),'unknown-date rows should be last');

const canonicalA=api.postCanonicalKey({url:'https://example.com/path/?utm_source=x#part'});
const canonicalB=api.postCanonicalKey({url:'https://example.com/path'});
assert.equal(canonicalA,canonicalB,'non-SOOP URL query/hash variants should canonicalize');

console.log('chunbong post normalization regression passed');
