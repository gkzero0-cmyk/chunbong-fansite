'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const quality=require('../youtube-quality.js');

test('prefers exact source date when dateIso is available',()=>{
  const item=quality.normalizeYoutubeItem({date:'1개월 전',dateIso:'2026-09-01T12:30:00Z'});
  assert.equal(item.date,'2026-09-01');
});

test('keeps relative date when no exact source date exists',()=>{
  const item=quality.normalizeYoutubeItem({date:'11개월 전',dateIso:''});
  assert.equal(item.date,'11개월 전');
});

test('normalizes video and shorts groups without inventing dates',()=>{
  const payload=quality.normalizeYoutubePayload({groups:{
    videos:[{date:'1개월 전',dateIso:'2026-09-01'}],
    shorts:[{date:'2026-09-19',dateIso:'2026-09-19'}]
  }});
  assert.equal(payload.groups.videos[0].date,'2026-09-01');
  assert.equal(payload.groups.shorts[0].date,'2026-09-19');
});
