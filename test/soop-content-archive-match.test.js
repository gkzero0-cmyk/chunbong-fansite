'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ingest = require('../lib/chunbong-content-auto-ingest.js');

test('official SOOP post can match 적자생존 from body text when title is generic', () => {
  const material = ingest.materialFromPost({
    id: '208562045',
    title: '추가 입주 모집 안내',
    date: '2026-10-02',
    link: 'https://www.sooplive.com/station/chunbongtv/post/208562045',
    content: '그냥서버 적자생존 추가 입주자를 모집합니다.'
  });

  const match = ingest.matchArchiveItem(material, [
    {
      id: 'justserver-survival',
      title: '그냥서버 : 적자생존',
      aliases: ['그냥서버 적자생존', '적자생존'],
      series: { id: 'justserver', title: '그냥서버' },
      startDate: '2026-09-30',
      endDate: '2026-10-21'
    }
  ]);

  assert.equal(match?.itemId, 'justserver-survival');
});
