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

  // Reproduce the unreliable board-scoped response: post 205800319 is leaked
  // and falsely stamped as if it belonged to 126448625.
  if (value.includes('/board/') && value.includes('board_number=126448625')) {
    return json({ contents: [
      { title_no: 205800319, board_number: 126448625, title: '8월 29일 수니콘', reg_date: '2026-08-31 18:00:00' },
      { title_no: 62502, board_number: 126448625, title: '625 최신 공지', reg_date: '2026-08-31 17:00:00' },
      { title_no: 62501, board_number: 126448625, title: '625 이전 공지', reg_date: '2026-08-31 16:00:00' }
    ] });
  }

  // The unscoped station board list carries the real board membership and is
  // therefore the canonical source used for strict filtering.
  if (value.includes('/board/') && !value.includes('board_number=126448625')) {
    return json({ contents: [
      { title_no: 205800319, board_number: 126448795, title: '8월 29일 수니콘', reg_date: '2026-08-31 18:00:00' },
      { title_no: 62502, board_number: 126448625, title: '625 최신 공지', reg_date: '2026-08-31 17:00:00' },
      { title_no: 62501, board_number: 126448625, title: '625 이전 공지', reg_date: '2026-08-31 16:00:00' },
      { title_no: 79502, board_number: 126448795, title: '795 다른 공지', reg_date: '2026-08-31 15:00:00' }
    ] });
  }

  // Per-post detail fan-out is intentionally unavailable here. The notice list
  // must not depend on dozens of detail requests just to determine membership.
  if (value.includes('/title/')) return json({}, false, 503);

  return json({ contents: [] });
});

assert.ok(
  !calls.some(url => url.includes('board_number=126448677') || url.includes('board_number=126448795')),
  'notice API must never request another board directly'
);
assert.ok(
  !calls.some(url => url.includes('/title/')),
  'notice loading must not fan out to per-post detail requests'
);
assert.deepEqual(
  body.items.map(item => item.title),
  ['625 최신 공지', '625 이전 공지'],
  'only posts whose canonical metadata says board 126448625 may appear'
);
assert.ok(
  body.items.every(item => item.boardNumber === '126448625'),
  'every notice must have canonical board number 126448625'
);

console.log('canonical single-board notice regression test passed');
