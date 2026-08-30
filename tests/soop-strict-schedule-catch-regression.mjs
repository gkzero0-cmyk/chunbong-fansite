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

// Board-scoped latest notices must never infer board membership when metadata is absent.
{
  const body = await run({ type: 'notice' }, async (url) => {
    const value = String(url);
    if (value.includes('board_number=126448625')) return json({ contents: [
      { title_no: 1, board_number: 126448625, title: '정상 625', reg_date: '2026-08-31 04:00:00' },
      { title_no: 2, title: '보드 불명 글', reg_date: '2026-08-31 05:00:00' }
    ] });
    if (value.includes('board_number=126448677')) return json({ contents: [
      { title_no: 3, board: { board_number: 126448677 }, title: '정상 677', reg_date: '2026-08-31 03:00:00' },
      { title_no: 4, title: '677 보드 불명 글', reg_date: '2026-08-31 06:00:00' }
    ] });
    return json({ contents: [] });
  });
  assert.deepEqual(new Set(body.items.map(item => item.title)), new Set(['정상 625', '정상 677']));
  assert.ok(!body.items.some(item => item.title.includes('불명')), 'posts without verified board metadata must be excluded');
  assert.ok(body.items.every(item => ['126448625','126448677'].includes(item.boardNumber)));
}

// Official schedule should use attached schedule images instead of a fragile embedded page.
{
  const body = await run({ type: 'notice-detail', id: '203015477' }, async (url) => {
    if (String(url).includes('/title/203015477')) return json({
      data: { post: {
        title_no: 203015477,
        title_name: '📅 방송 일정표',
        reg_date: '2026-07-31 12:00:00',
        contents: '<p>잠시 기다리시면 보입니다 :)</p><iframe src="https://dead.example.com/404"></iframe>',
        attachments: [
          { type: 'image', image_url: 'https://stimg.sooplive.com/schedule/chunbong-week.png' }
        ]
      }}
    });
    return html('', false, 404);
  });
  assert.deepEqual(body.item?.images, ['https://stimg.sooplive.com/schedule/chunbong-week.png']);
}

// CATCH page API can expose its list and fields in nested catch-specific shapes.
{
  const body = await run({ type: 'clips' }, async (url) => {
    const value = String(url);
    if (value.includes('/vod/catch')) return json({ data: { catchList: Array.from({ length: 14 }, (_, i) => ({
      catchNo: 9000 + i,
      catchTitle: `캐치 ${i + 1}`,
      regDate: `2026-08-${String(31 - i).padStart(2, '0')} 12:00:00`,
      thumbnail: { url: `https://stimg.sooplive.com/catch/${9000 + i}.jpg` },
      viewCount: 100 + i,
      catchUrl: `https://vod.sooplive.com/player/${9000 + i}/catch`
    })) } });
    if (value.includes('/vod/clip') || value.includes('/vods/clip')) return json({ data: [] });
    return json({ data: [] });
  });
  assert.equal(body.groups.catch.length, 12);
  assert.equal(body.groups.catch[0].title, '캐치 1');
  assert.equal(body.groups.catch[0].thumb, 'https://stimg.sooplive.com/catch/9000.jpg');
  assert.match(body.groups.catch[0].link, /\/catch$/);
}

console.log('strict notice + direct schedule image + catch regression test passed');
