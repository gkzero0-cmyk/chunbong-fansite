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

  if (value.includes('board_number=126448625')) {
    return json({ contents: [
      { title_no: 62502, board_number: 126448625, title: '625 최신 공지', reg_date: '2026-08-31 17:00:00' },
      { title_no: 62501, board_number: 126448625, title: '625 이전 공지', reg_date: '2026-08-31 16:00:00' }
    ] });
  }

  if (value.includes('board_number=126448677')) {
    return json({ contents: [
      { title_no: 67701, board_number: 126448677, title: '677 공지는 나오면 안 됨', reg_date: '2026-08-31 18:00:00' }
    ] });
  }

  return json({ contents: [] });
});

assert.ok(
  !calls.some(url => url.includes('board_number=126448677')),
  'notice API must not request board 126448677'
);
assert.deepEqual(
  body.items.map(item => item.title),
  ['625 최신 공지', '625 이전 공지'],
  'notice menu should contain only board 126448625 posts'
);
assert.ok(
  body.items.every(item => item.boardNumber === '126448625'),
  'every notice must belong to board 126448625'
);

console.log('single-board notice regression test passed');
