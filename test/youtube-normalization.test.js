'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const youtube = require('../lib/content-api/youtube.js');

test('normalizes raw and abbreviated view labels to one public format', () => {
  assert.equal(youtube.formatViewMeta('104'), '조회수 104회');
  assert.equal(youtube.formatViewMeta('1.1천'), '조회수 1,100회');
  assert.equal(youtube.formatViewMeta('조회수 5.1천회'), '조회수 5,100회');
});

test('does not invent an exact date from a relative YouTube date', () => {
  const item = youtube.normalizeVideo({
    videoId:'abcdefghijk',
    title:{simpleText:'테스트'},
    publishedTimeText:{simpleText:'1개월 전'},
    viewCountText:{simpleText:'104'}
  });
  assert.equal(item.date, '1개월 전');
  assert.equal(item.dateIso, '');
  assert.equal(item.meta, '조회수 104회');
});
