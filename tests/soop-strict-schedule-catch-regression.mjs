import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contentPath = require.resolve('../api/content.js');

function json(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}
function html(payload, ok = true, status = 200) {
  return { ok, status, text: async () => payload, json: async () => { throw new Error('not json'); } };
}
async function run(query, fetchImpl) {
  for (const key of Object.keys(require.cache)) if (key.includes('/api/')) delete require.cache[key];
  global.fetch = fetchImpl;
  const handler = require(contentPath);
  let body;
  const res = { setHeader() {}, status() { return this; }, json(payload) { body = payload; return payload; } };
  await handler({ query }, res);
  return body;
}

// A board-scoped response is proof of membership when SOOP omits board_number,
// but an explicitly conflicting board number must still be rejected.
{
  const calls = [];
  const body = await run({ type: 'notice' }, async (url) => {
    const value = String(url); calls.push(value);
    if (value.includes('board_number=126448625')) return json({ contents: [
      { title_no: 1, title: '625 무메타 정상', reg_date: '2026-08-31 05:00:00' },
      { title_no: 2, board_number: 999999999, title: '625 다른 게시판', reg_date: '2026-08-31 06:00:00' }
    ] });
    if (value.includes('board_number=126448677')) return json({ contents: [
      { title_no: 3, board: { board_number: 126448677 }, title: '677 메타 정상', reg_date: '2026-08-31 04:00:00' },
      { title_no: 4, title: '677 무메타 정상', reg_date: '2026-08-31 03:00:00' }
    ] });
    return json({ contents: [] });
  });
  assert.ok(!calls.some(url => !url.includes('board_number=') && url.includes('/board/')), 'global fallback should not be needed when both scoped boards returned usable rows');
  assert.deepEqual(body.items.map(item => item.title), ['625 무메타 정상', '677 메타 정상', '677 무메타 정상']);
  assert.deepEqual(body.items.map(item => item.boardNumber), ['126448625', '126448677', '126448677']);
  assert.ok(!body.items.some(item => item.title.includes('다른 게시판')), 'explicit conflicting board metadata must be rejected');
}

// The global fallback may only accept rows whose board metadata is explicitly one of the two allowlisted boards.
{
  const body = await run({ type: 'notice' }, async (url) => {
    const value = String(url);
    if (value.includes('board_number=126448625')) return json({ contents: [] });
    if (value.includes('board_number=126448677')) return json({ contents: [
      { title_no: 7, board_number: 126448677, title: '677 정상', reg_date: '2026-08-31 01:00:00' }
    ] });
    return json({ contents: [
      { title_no: 5, title: '전체목록 무메타 제외', reg_date: '2026-08-31 09:00:00' },
      { title_no: 6, board_number: 126448625, title: '625 fallback 정상', reg_date: '2026-08-31 08:00:00' },
      { title_no: 8, board_number: 999999999, title: '전체목록 타게시판 제외', reg_date: '2026-08-31 10:00:00' }
    ] });
  });
  assert.deepEqual(body.items.map(item => item.title), ['625 fallback 정상', '677 정상']);
}

// The official schedule source currently returns only a placeholder plus a dead embed;
// never surface unrelated profile/cover media as the schedule image in that case.
{
  const body = await run({ type: 'notice-detail', id: '203015477' }, async (url) => {
    if (String(url).includes('/title/203015477')) return json({
      data: { post: {
        title_no: 203015477,
        title_name: '📅 방송 일정표',
        reg_date: '2026-07-31 12:00:00',
        profileImage: 'https://cdn.example.com/chunbong-main.webp',
        cover_image: 'https://cdn.example.com/channel-cover.jpg',
        contents: '<p>잠시 기다리시면 보입니다 :)</p><iframe src=\"https://dead.example.com/404\"></iframe>',
        attachments: [
          { type: 'image', image_url: 'https://stimg.sooplive.com/schedule/chunbong-week.png' }
        ]
      }}
    });
    return html('', false, 404);
  });
  assert.deepEqual(body.item?.images, [], 'placeholder-only schedule posts must not surface guessed images');
  assert.deepEqual(body.item?.embeds, [], 'placeholder-only schedule posts must not surface dead embeds');
  assert.match(body.item?.content || '', /잠시\s*기다리시면\s*보입니다/);
}

// CATCH must be de-duplicated by catch id, sorted newest-first, and limited to 12.
{
  const entries = [
    { catchNo: 9001, catchTitle: '오래된 캐치', regDate: '2026-08-20 12:00:00', thumbnail: { url: 'https://stimg.sooplive.com/catch/9001-old.jpg' }, catchUrl: 'https://vod.sooplive.com/player/9001/catch' },
    { catchNo: 9014, catchTitle: '가장 최신 캐치', regDate: '2026-08-31 18:00:00', thumbnail: { url: 'https://stimg.sooplive.com/catch/9014.jpg' }, viewCount: 514, catchUrl: 'https://vod.sooplive.com/player/9014/catch' },
    { catchNo: 9001, catchTitle: '중복 캐치 새 버전', regDate: '2026-08-30 19:00:00', thumbnail: { url: 'https://stimg.sooplive.com/catch/9001-new.jpg' }, catchUrl: 'https://vod.sooplive.com/player/9001/catch' },
    ...Array.from({ length: 12 }, (_, i) => ({
      catchNo: 9002 + i,
      catchTitle: `캐치 ${i + 2}`,
      regDate: `2026-08-${String(29 - i).padStart(2, '0')} 12:00:00`,
      thumbnail: { url: `https://stimg.sooplive.com/catch/${9002 + i}.jpg` },
      viewCount: 100 + i,
      catchUrl: `https://vod.sooplive.com/player/${9002 + i}/catch`
    }))
  ];
  const body = await run({ type: 'clips' }, async (url) => {
    const value = String(url);
    if (value.includes('/vod/catch')) return json({ data: { catchList: entries } });
    if (value.includes('/vod/clip') || value.includes('/vods/clip')) return json({ data: [] });
    return json({ data: [] });
  });
  assert.equal(body.groups.catch.length, 12);
  assert.equal(body.groups.catch[0].id, '9014');
  assert.equal(body.groups.catch[0].title, '가장 최신 캐치');
  assert.equal(new Set(body.groups.catch.map(item => item.id)).size, body.groups.catch.length, 'CATCH ids should be unique');
  assert.ok(body.groups.catch.every(item => item.kind === 'catch' && /\/catch$/.test(item.link)), 'CATCH list should contain catch links only');
}

console.log('scoped notices + schedule media + catch ordering regression test passed');
