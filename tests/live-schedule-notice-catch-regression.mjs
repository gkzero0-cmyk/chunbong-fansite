import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  let body; let statusCode = 200;
  const res = { setHeader() {}, status(code) { statusCode = code; return this; }, json(payload) { body = payload; return payload; } };
  await handler({ query }, res);
  return { body, statusCode };
}

// Public Notion calendar should be queried live, not only from the static snapshot.
{
  const calls = [];
  const { body } = await run({ type: 'schedule' }, async (url, options = {}) => {
    const value = String(url); calls.push(value);
    if (value.endsWith('/loadPageChunk')) {
      return json({ recordMap: {
        block: {
          root: { value: { id: 'root', type: 'page', content: ['cv'] } },
          cv: { value: { id: 'cv', type: 'collection_view', collection_id: 'col1', view_ids: ['view1'] } }
        },
        collection: {
          col1: { value: { schema: {
            title: { name: '이름', type: 'title' },
            date: { name: '날짜', type: 'date' },
            tag: { name: '태그', type: 'multi_select' }
          } } }
        },
        collection_view: { view1: { value: { id: 'view1', type: 'calendar', query2: { sort: [] } } } }
      }});
    }
    if (value.endsWith('/queryCollection')) {
      return json({ recordMap: { block: {
        row1: { value: { id: 'row1', type: 'page', parent_id: 'col1', properties: {
          title: [['새 라이브 일정']],
          date: [['‣', [['d', { type: 'date', start_date: '2026-09-01', start_time: '20:30', time_zone: 'Asia/Seoul' }]]]],
          tag: [['콘텐츠,타로']]
        } } },
        row2: { value: { id: 'row2', type: 'page', parent_id: 'col1', properties: {
          title: [['휴방']],
          date: [['‣', [['d', { type: 'date', start_date: '2026-09-02' }]]]],
          tag: [['휴방']]
        } } }
      } } });
    }
    return json({}, false, 404);
  });
  assert.ok(calls.some(url => url.endsWith('/loadPageChunk')));
  assert.ok(calls.some(url => url.endsWith('/queryCollection')));
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].title, '새 라이브 일정');
  assert.equal(body.items[0].start, '2026-09-01T20:30:00+09:00');
  assert.deepEqual(body.items[0].tags, ['콘텐츠', '타로']);
}

// Notices should use canonical bbs_no metadata, both host fallbacks, dedupe, and keep the latest 12 from board 126448625 only.
{
  const calls = [];
  const approved = Array.from({ length: 12 }, (_, i) => ({
    title_no: 205900000 - i,
    bbs_no: 126448625,
    title_name: `625 공지 ${i + 1}`,
    reg_date: `2026-08-${String(31 - i).padStart(2, '0')} 12:00:00`
  }));
  const { body } = await run({ type: 'notice' }, async url => {
    const value = String(url); calls.push(value);
    const page = /[?&]page=(\d+)/.exec(value)?.[1] || '1';
    if (!value.includes('/board/')) return json({ data: [] });
    if (page !== '1') return json({ data: [] });
    if (value.includes('chapi.sooplive.com')) {
      return json({ data: [approved[0], { title_no: 205700001, bbs_no: 126448677, title_name: '677 제외', reg_date: '2026-08-31 11:00:00' }] });
    }
    if (value.includes('chapi.sooplive.co.kr')) {
      return json({ data: [
        ...approved,
        { title_no: 205700002, bbs_no: 126448795, title_name: '795 제외', reg_date: '2026-08-31 10:00:00' },
        { title_no: 205700003, title_name: '게시판 미확인 제외', reg_date: '2026-08-31 09:00:00' }
      ] });
    }
    return json({ data: [] });
  });
  assert.equal(body.items.length, 12);
  assert.ok(body.items.every(item => item.boardNumber === '126448625'));
  assert.equal(new Set(body.items.map(item => item.id)).size, 12, 'duplicate host rows should be removed');
  assert.ok(!body.items.some(item => ['205700001', '205700002', '205700003'].includes(item.id)));
  assert.ok(calls.some(url => url.includes('chapi.sooplive.com')));
  assert.ok(calls.some(url => url.includes('chapi.sooplive.co.kr')));
}

// CATCH detail API can still resolve a direct file as a fallback/debug endpoint.
{
  const { body } = await run({ type: 'catch-detail', id: '205000001' }, async (url, options = {}) => {
    assert.match(String(url), /api\.m\.sooplive\.com\/station\/video\/a\/view/);
    assert.equal(options.method, 'POST');
    assert.match(String(options.body), /nTitleNo=205000001/);
    return json({ data: {
      title: '최신 캐치', thumb: 'https://videoimg.sooplive.com/catch.jpg',
      files: [{ file: 'https://video.sooplive.com/catch.mp4', duration: 45000 }]
    } });
  });
  assert.equal(body.item.stream, 'https://video.sooplive.com/catch.mp4');
  assert.equal(body.item.title, '최신 캐치');
}

const clipsHtml = fs.readFileSync(new URL('../clips.html', import.meta.url), 'utf8');
const liveFixes = fs.readFileSync(new URL('../live-fixes.js', import.meta.url), 'utf8');
const shared = fs.readFileSync(new URL('../api/_shared.js', import.meta.url), 'utf8');
assert.ok(clipsHtml.includes('id="clip-player"'), 'CATCH viewer should include the SOOP iframe player');
assert.ok(shared.includes('type=catch'), 'CATCH items should use the official SOOP Catch embed player');
assert.ok(!liveFixes.includes('type=catch-detail'), 'frontend should not override CATCH with direct CDN playback');
assert.ok(liveFixes.includes('type=schedule'), 'schedule override should request live Notion schedule data');

console.log('live Notion + canonical notices + official Catch player regression test passed');
