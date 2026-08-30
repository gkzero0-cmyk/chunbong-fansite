import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modulePath = require.resolve('../api/content.js');

function responseJson(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}

async function runHandler(query, fetchImpl) {
  delete require.cache[modulePath];
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/chunbong-fansite/api/')) delete require.cache[key];
  }
  global.fetch = fetchImpl;
  const handler = require(modulePath);
  let statusCode = 200;
  let body;
  const res = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return payload; }
  };
  await handler({ query }, res);
  return { statusCode, body };
}

{
  const calls = [];
  const { statusCode, body } = await runHandler({ type: 'notice-detail', id: '777' }, async (url) => {
    calls.push(String(url));
    if (String(url).includes('/chunbongtv/title/777')) {
      return responseJson({
        title_no: 777,
        title_name: '상세 공지 테스트',
        contents: '<p>본문 <strong>강조</strong><br><a href="https://example.com">링크</a><img src="https://example.com/a.jpg" onerror="alert(1)"></p><script>alert(1)</script>',
        reg_date: '2026-08-30T02:03:04.000Z'
      });
    }
    return responseJson({}, false, 404);
  });
  assert.equal(statusCode, 200, 'notice detail endpoint should succeed');
  assert.equal(body.item.id, '777');
  assert.match(body.item.content, /본문/);
  assert.match(body.item.html, /<strong>강조<\/strong>/, 'safe formatting should be preserved');
  assert.match(body.item.html, /href="https:\/\/example.com\/?"/, 'safe links should be preserved');
  assert.match(body.item.html, /<img[^>]+src="https:\/\/example.com\/a.jpg"/, 'safe images should be preserved');
  assert.doesNotMatch(body.item.html, /script|onerror/i, 'unsafe markup should be removed');
  assert.ok(calls.some(url => url.includes('/title/777')), 'detail endpoint should call SOOP title API');
}

const root = new URL('../', import.meta.url);
const pageJs = fs.readFileSync(new URL('page.js', root), 'utf8');
assert.ok(pageJs.includes("type=notice-detail&id="), 'notice page should request individual notice details');
assert.ok(pageJs.includes('loadNoticeDetail'), 'notice page should have lazy detail loading');

const hero = fs.readFileSync(new URL('assets/chunbong-main.webp', root));
const heroHash = crypto.createHash('sha256').update(hero).digest('hex');
assert.equal(heroHash, '06442bfda6e52e174da5cda590821648238f7b6a08ba8137f75a11276d8746c5', 'main hero should use the newly attached character image');

console.log('notice detail regression test passed');

{
  const { statusCode, body } = await runHandler({ type: 'notice-detail', id: '888' }, async (url) => {
    if (String(url).includes('/chunbongtv/title/888')) {
      return responseJson({
        data: {
          title_no: 888,
          title_name: '구조화 본문 공지',
          contents: {
            document: {
              children: [
                { type: 'paragraph', children: [
                  { type: 'text', text: '팬사이트 안에서 직접 보이는 본문입니다.' },
                  { type: 'link', href: 'https://example.com/guide', text: '안내 링크' }
                ]},
                { type: 'image', src: 'https://example.com/notice.jpg', alt: '공지 이미지' },
                { type: 'paragraph', content: { text: '두 번째 문단입니다.' } }
              ]
            }
          },
          reg_date: '2026-08-30T03:04:05.000Z'
        }
      });
    }
    return responseJson({}, false, 404);
  });
  assert.equal(statusCode, 200, 'structured notice detail endpoint should succeed');
  assert.match(body.item.html, /팬사이트 안에서 직접 보이는 본문입니다/);
  assert.match(body.item.html, /안내 링크/);
  assert.match(body.item.html, /href="https:\/\/example.com\/guide"/);
  assert.match(body.item.html, /<img[^>]+src="https:\/\/example.com\/notice.jpg"/);
  assert.match(body.item.html, /두 번째 문단입니다/);
  assert.doesNotMatch(body.item.html, /\[object Object\]/, 'structured SOOP body must never stringify objects');
  assert.doesNotMatch(body.item.content, /\[object Object\]/, 'plain-text fallback must never stringify objects');
}

{
  const shared = require('../api/_shared.js');
  const post = shared.normalizePost({
    title_no: 889,
    title_name: '목록 구조화 본문',
    contents: { children: [{ text: '목록에서도 객체 문자열이 나오면 안 됩니다.' }] },
    reg_date: '2026-08-30T03:05:06.000Z'
  });
  assert.doesNotMatch(post.content, /\[object Object\]/, 'notice list fallback must not stringify structured bodies');
}
