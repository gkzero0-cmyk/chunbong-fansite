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
    // This mirrors the live SOOP station board response: the canonical board
    // identifier is `bbs_no`, not `board_number`.
    return json({ data: [
      { title_no: 205830745, bbs_no: 126448625, title_name: '8. 31 드릴말씀.', reg_date: '2026-08-31 17:27:31' },
      { title_no: 205822721, bbs_no: 126448625, title_name: '625 정상 공지', reg_date: '2026-08-31 12:00:00' },
      { title_no: 205800319, bbs_no: 126448795, title_name: '8월 29일 수니콘', reg_date: '2026-08-31 03:31:58' },
      { title_no: 205750269, bbs_no: 126448677, title_name: '다른 게시판 글', reg_date: '2026-08-30 18:00:00' }
    ] });
  }

  if (value.includes('/title/')) return json({}, false, 503);
  return json({ data: [] });
});

assert.ok(!calls.some(url => url.includes('/title/')), 'notice loading must not fan out to per-post detail requests');
assert.deepEqual(
  body.items.map(item => item.id),
  ['205830745', '205822721'],
  'only live SOOP rows whose bbs_no is 126448625 may appear'
);
assert.ok(
  body.items.every(item => item.boardNumber === '126448625'),
  'bbs_no must normalize to boardNumber 126448625'
);
assert.ok(
  !body.items.some(item => item.id === '205800319'),
  'post 205800319 from bbs_no 126448795 must be excluded'
);

console.log('live bbs_no single-board notice regression test passed');
