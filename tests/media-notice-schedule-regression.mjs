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
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/api/')) delete require.cache[key];
  }
  global.fetch = fetchImpl;
  const handler = require(contentPath);
  let body;
  let statusCode = 200;
  const res = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return payload; }
  };
  await handler({ query }, res);
  return { body, statusCode };
}

// YouTube /videos now commonly exposes regular uploads as lockupViewModel cards.
{
  const videoId = index => `v${String(index).padStart(10, '0')}`.slice(0, 11);
  const lockup = index => ({
    lockupViewModel: {
      contentId: videoId(index),
      metadata: {
        lockupMetadataViewModel: {
          title: { content: `최신 동영상 ${index}` },
          metadata: {
            contentMetadataViewModel: {
              metadataRows: [
                { metadataParts: [{ text: { content: `조회수 ${index}회` } }] },
                { metadataParts: [{ text: { content: `${index}시간 전` } }] }
              ]
            }
          }
        }
      },
      contentImage: {
        thumbnailViewModel: { image: { sources: [{ url: `https://i.ytimg.com/vi/${videoId(index)}/hqdefault.jpg` }] } }
      }
    }
  });
  const { body } = await run({ type: 'youtube' }, async (url) => {
    const value = String(url);
    if (value.includes('/videos')) return html(`<script>var ytInitialData = ${JSON.stringify({items:Array.from({length:14}, (_,i)=>lockup(i+1))})};</script>`);
    if (value.includes('/shorts')) return html(`<script>var ytInitialData = ${JSON.stringify({items:[]})};</script>`);
    return html('', false, 404);
  });
  assert.equal(body.groups.videos.length, 12, 'lockupViewModel uploads should populate the latest 12 videos');
  assert.equal(body.groups.videos[0].title, '최신 동영상 1');
  assert.match(body.groups.videos[0].embed, /youtube\.com\/embed\//);
}

// Latest notices must come only from the two approved SOOP boards and be merged newest-first.
{
  const calls = [];
  const { body } = await run({ type: 'notice' }, async (url) => {
    const value = String(url); calls.push(value);
    if (value.includes('board_number=126448625')) {
      return json({ contents: [
        { title_no: 62502, board_number: 126448625, title: '625 최신', reg_date: '2026-08-31 03:00:00', contents: 'A' },
        { title_no: 62501, board_number: 126448625, title: '625 이전', reg_date: '2026-08-29 03:00:00', contents: 'B' }
      ] });
    }
    if (value.includes('board_number=126448677')) {
      return json({ contents: [
        { title_no: 67702, board_number: 126448677, title: '677 최신', reg_date: '2026-08-31 04:00:00', contents: 'C' },
        { title_no: 99999, board_number: 999999999, title: '다른 게시판', reg_date: '2026-09-01 00:00:00', contents: 'X' },
        { title_no: 67701, board_number: 126448677, title: '677 이전', reg_date: '2026-08-28 03:00:00', contents: 'D' }
      ] });
    }
    return json({ contents: [] });
  });
  assert.ok(calls.some(url => url.includes('board_number=126448625')), 'first notice board should be requested');
  assert.ok(calls.some(url => url.includes('board_number=126448677')), 'second notice board should be requested');
  assert.deepEqual(body.items.map(item => item.title), ['677 최신','625 최신','625 이전','677 이전']);
  assert.ok(body.items.every(item => ['126448625','126448677'].includes(item.boardNumber)), 'no other board should leak into latest notices');
}

// The official schedule post may be nested inside the SOOP title API payload.
{
  const { body } = await run({ type: 'notice-detail', id: '203015477' }, async (url) => {
    const value = String(url);
    if (value.includes('/title/203015477')) {
      return json({
        data: {
          post: {
            title_no: 203015477,
            title_name: '공식 방송 일정 안내',
            reg_date: '2026-08-30 12:00:00',
            contents: {
              type: 'document',
              children: [
                { type: 'paragraph', children: [{ type: 'text', text: '이번 주 공식 일정입니다.' }] },
                { type: 'image', src: 'https://example.com/schedule.jpg', alt: '공식 일정 이미지' }
              ]
            }
          }
        }
      });
    }
    return html('', false, 404);
  });
  assert.equal(body.item?.title, '공식 방송 일정 안내');
  assert.match(body.item?.content || '', /이번 주 공식 일정입니다/);
  assert.match(body.item?.html || '', /schedule\.jpg/);
}


// The official schedule post can contain a real schedule in an iframe while the visible body only says to wait.
{
  const { body } = await run({ type: 'notice-detail', id: '203015477' }, async (url) => {
    const value = String(url);
    if (value.includes('/title/203015477')) {
      return json({
        data: {
          post: {
            title_no: 203015477,
            title_name: '📅 방송 일정표',
            reg_date: '2026-07-31 12:00:00',
            contents: `<p>잠시 기다리시면 보입니다 :)</p><iframe src="https://schedule.example.com/chunbong/week" width="100%" height="720"></iframe>`
          }
        }
      });
    }
    return html('', false, 404);
  });
  assert.deepEqual(body.item?.embeds, ['https://schedule.example.com/chunbong/week'], 'official schedule embed URL should survive sanitization separately');
}

console.log('media + dual notice + schedule regression test passed');
