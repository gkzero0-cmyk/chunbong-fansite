'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const archive = require('../lib/chunbong-content-archive-core.js');

test('public Chuntacle archive keeps canonical event dates across poster records', () => {
  const item = archive.toPublicArchiveItem({
    id: 'chuntacle-2026',
    title: '춘타클 · 춘봉 타로 클래스',
    category: 'class-event',
    role: '주최 · 강의',
    status: 'ended',
    startDate: '2026-07',
    endDate: '2026-09',
    datePrecision: 'month',
    heroImage: { src: 'assets/chuntacle.webp', alt: '사용자 지정 춘타클 대표 이미지' },
    seriesSessions: [
      { id: 'session-1', number: 1, title: '춘타클 제1회', date: '2026-07-12', datePrecision: 'day', time: '20:00', participants: ['A'] },
      { id: 'session-2', number: 2, title: '춘타클 제2회', date: '2026-07-22', datePrecision: 'day', time: '20:00', participants: ['B'] }
    ],
    timeline: [
      { id: 'session-1', type: 'result', title: '춘타클 제1회 · 포스터 기록', date: '2026-07-12', datePrecision: 'day', note: '사용자가 춘타클 제1회 방송 기록으로 제공한 자료입니다.', visibility: 'public' },
      { id: 'session-2', type: 'result', title: '춘타클 제2회 · 포스터 기록', date: '2026-07-22', datePrecision: 'day', note: '사용자가 춘타클 제2회 방송 기록으로 제공한 자료입니다.', visibility: 'public' }
    ],
    media: [
      { id: 'vod-1', type: 'vod', title: '춘타클 1회', date: '2026-07-12', datePrecision: 'day', note: '사용자가 춘타클 제1회 방송 기록으로 제공한 SOOP VOD입니다.', visibility: 'public' }
    ],
    gallery: [
      { id: 'chuntacle-session-1', src: 'assets/1.webp', alt: '사용자 제공 춘타클 제1회 포스터', caption: '2026-07-12 · 춘타클 제1회 실제 포스터' },
      { id: 'chuntacle-session-2', src: 'assets/2.webp', alt: '사용자 지정 춘타클 제2회 포스터', caption: '2026-07-22 · 춘타클 제2회 실제 포스터' }
    ],
    sources: [],
    published: true
  });

  assert.equal(item.seriesSessions[0].date, '2026-07-11');
  assert.equal(item.seriesSessions[1].date, '2026-07-21');
  assert.equal(item.timeline[0].date, '2026-07-11');
  assert.equal(item.timeline[1].date, '2026-07-21');
  assert.match(item.gallery[0].caption, /^2026-07-11/);
  assert.match(item.gallery[1].caption, /^2026-07-21/);
  assert.doesNotMatch(JSON.stringify(item), /사용자가|사용자 제공|사용자 지정/);
  assert.equal(item.media[0].date, '2026-07-12', 'VOD publication date should remain untouched');
});
