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

  if (value.includes('/board/') && value.includes('board_number=126448625')) {
    return json({ contents: [
      // Reproduce SOOP leaking post 205800319 into the scoped list while
      // presenting it as if it belonged to the requested board.
      { title_no: 205800319, board_number: 126448625, title: '8월 29일 수니콘', reg_date: '2026-08-31 18:00:00' },
      { title_no: 62502, board_number: 126448625, title: '625 최신 공지', reg_date: '2026-08-31 17:00:00' },
      { title_no: 62501, board_number: 126448625, title: '625 이전 공지', reg_date: '2026-08-31 16:00:00' }
    ] });
  }

  if (value.includes('/title/205800319')) {
    return json({ data: { post: { title_no: 205800319, board_number: 126448795 } } });
  }
  if (value.includes('/title/62502')) {
    return json({ data: { post: { title_no: 62502, board_number: 126448625 } } });
  }
  if (value.includes('/title/62501')) {
    return json({ data: { post: { title_no: 62501, board_number: 126448625 } } });
  }

  if (value.includes('board_number=126448677') || value.includes('board_number=126448795')) {
    return json({ contents: [] });
  }

  return json({ contents: [] });
});

assert.ok(
  !calls.some(url => url.includes('board_number=126448677') || url.includes('board_number=126448795')),
  'notice API must only request board 126448625'
);
assert.ok(
  calls.some(url => url.includes('/title/205800319')),
  'each scoped notice must be verified against its detail metadata'
);
assert.deepEqual(
  body.items.map(item => item.title),
  ['625 최신 공지', '625 이전 공지'],
  'post 205800319 from board 126448795 must never appear in the notice menu'
);
assert.ok(
  body.items.every(item => item.boardNumber === '126448625'),
  'every notice must be detail-verified as board 126448625'
);

console.log('strict single-board notice regression test passed');
