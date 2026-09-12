import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contentPath = require.resolve('../api/content.js');

function json(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}

async function run(query, fetchImpl) {
  for (const key of Object.keys(require.cache)) if (key.includes('/api/')) delete require.cache[key];
  global.fetch = fetchImpl;
  const handler = require(contentPath);
  let body;
  const res = {
    setHeader() {},
    status() { return this; },
    json(payload) { body = payload; return payload; }
  };
  await handler({ query }, res);
  return body;
}

const calls = [];
const body = await run({ type: 'notice' }, async url => {
  const value = String(url);
  calls.push(value);

  if (value.includes('/board/')) {
    // This mirrors the live SOOP station board response: ordinary rows are in
    // `data`, while pinned/notice rows are returned separately in `notice_data`.
    return json({
      data: [
        { title_no: 206914645, bbs_no: 126448625, title_name: '춘봉이 3D 키캡', reg_date: '2026-09-12 13:13:09' },
        { title_no: 206833139, bbs_no: 126448625, title_name: '9/11 공지', reg_date: '2026-09-11 16:43:14' },
        { title_no: 205800319, bbs_no: 126448795, title_name: '다른 게시판 글', reg_date: '2026-09-11 15:31:58' },
        { title_no: 205750269, bbs_no: 126448677, title_name: '다른 게시판 글 2', reg_date: '2026-09-10 18:00:00' }
      ],
      notice_data: [
        { title_no: 206868123, bbs_no: 126448625, title_name: '하요리 -완- 및 빙하기 공지', reg_date: '2026-09-11 22:55:12', notice_yn: 2 },
        { title_no: 203015477, bbs_no: 126448625, title_name: '📅 방송 일정표', reg_date: '2026-07-31 22:35:51', notice_yn: 2 }
      ]
    });
  }

  if (value.includes('/title/')) return json({}, false, 503);
  return json({ data: [] });
});

assert.ok(!calls.some(url => url.includes('/title/')), 'notice loading must not fan out to per-post detail requests');
assert.deepEqual(
  body.items.map(item => item.id),
  ['206914645', '206868123', '206833139', '203015477'],
  'notice_data rows must be merged with ordinary board rows and sorted by their real reg_date'
);
assert.ok(
  body.items.every(item => item.boardNumber === '126448625'),
  'bbs_no must normalize to boardNumber 126448625'
);
assert.ok(
  !body.items.some(item => item.id === '205800319' || item.id === '205750269'),
  'rows from other bbs_no values must remain excluded'
);

console.log('live bbs_no plus notice_data regression test passed');
