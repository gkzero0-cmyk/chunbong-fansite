import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modulePath = require.resolve('../api/content.js');

function responseJson(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}

async function runHandler(type, fetchImpl) {
  delete require.cache[modulePath];
  global.fetch = fetchImpl;
  const handler = require(modulePath);
  let statusCode = 200;
  let body;
  const res = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return payload; }
  };
  await handler({ query: { type } }, res);
  return { statusCode, body };
}

// NOTICE: the board-filtered request can be empty, while the general board response
// uses the current api-channel-style `contents` array and camelCase fields.
{
  const calls = [];
  const { body } = await runHandler('notice', async (url) => {
    calls.push(String(url));
    if (String(url).includes('board_number=126448625')) {
      return responseJson({ data: { contents: [] } });
    }
    return responseJson({
      contents: [
        { postNo: 777, boardNumber: 126448625, title: '테스트 공지', contents: '<p>공지 본문입니다.</p>', regDate: '2026-08-30T01:02:03.000Z' },
        { postNo: 778, boardNumber: 999, title: '다른 게시판', contents: '제외', regDate: '2026-08-29' }
      ]
    });
  });
  assert.equal(body.items.length, 1, 'notice should fall back to the general board and filter the requested board');
  assert.equal(body.items[0].title, '테스트 공지');
  assert.match(body.items[0].content, /공지 본문/);
  assert.ok(calls.length >= 2, 'notice should try a second source when the filtered source is empty');
}

// FANART: use the current Naver Cafe SPA board-list API and article detail API.
{
  const calls = [];
  const { body } = await runHandler('fanart', async (url) => {
    const value = String(url);
    calls.push(value);
    if (value.includes('cafe-boardlist-api/v1/cafes/31591439/menus/18/articles')) {
      return responseJson({
        result: {
          articles: [
            { articleId: 4321, subject: '팬아트 테스트', writerNickname: '팬작가', writeDateTimestamp: 1788048000000, menuId: 18 }
          ]
        }
      });
    }
    if (value.includes('cafe-articleapi/v3/cafes/31591439/articles/4321')) {
      return responseJson({
        result: {
          contentHtml: '<div class="se-main-container"><img src="https://example.com/fanart.jpg"><p>작품 설명</p></div>'
        }
      });
    }
    return responseJson({}, false, 404);
  });
  assert.equal(body.items.length, 1, 'fanart should load from the current Cafe SPA APIs');
  assert.equal(body.items[0].title, '팬아트 테스트');
  assert.equal(body.items[0].author, '팬작가');
  assert.equal(body.items[0].thumb, 'https://example.com/fanart.jpg');
  assert.ok(calls.some(url => url.includes('cafe-boardlist-api')), 'fanart should use the new board-list API');
  assert.ok(calls.some(url => url.includes('cafe-articleapi')), 'fanart should inspect article content for images');
}

// HOT CLIP: Catch and user clips must stay in separate groups and preserve their source type.
{
  const { body } = await runHandler('clips', async (url) => {
    const value = String(url);
    if (value.includes('/vods/catch') || value.includes('/vod/catch')) {
      return responseJson({
        data: [
          { catch_no: 991, catch_title: '캐치 영상', reg_date: '2026-08-30', thumbnail_url: 'https://example.com/catch.jpg' }
        ]
      });
    }
    if (value.includes('/vod/clip') || value.includes('/vods/clip')) {
      return responseJson({
        contents: [
          { titleNo: 992, titleName: '클립 영상', regDate: '2026-08-29', thumbnailUrl: 'https://example.com/clip.jpg' }
        ]
      });
    }
    return responseJson({}, false, 404);
  });
  assert.ok(body.groups, 'clips response should expose grouped content');
  assert.equal(body.groups.catch.length, 1, 'Catch should have its own group');
  assert.equal(body.groups.clip.length, 1, 'clips should have their own group');
  assert.equal(body.groups.catch[0].kind, 'catch');
  assert.equal(body.groups.clip[0].kind, 'clip');
  assert.match(body.groups.catch[0].link, /\/catch/);
}

import fs from 'node:fs';
const clipsHtml = fs.readFileSync(new URL('../clips.html', import.meta.url), 'utf8');
const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');
assert.ok(clipsHtml.includes('data-clip-kind=\"catch\"'), 'clips page should have a Catch tab');
assert.ok(clipsHtml.includes('data-clip-kind=\"clip\"'), 'clips page should have a Clip tab');
assert.ok(pageJs.includes('renderClipsPage'), 'clips page should have grouped rendering logic');
assert.ok(pageJs.includes('retry-content'), 'content error states should expose retry controls');

console.log('content regression test passed');
