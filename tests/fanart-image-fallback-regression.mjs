import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const originalFetch = global.fetch;
const requested = [];

global.fetch = async url => {
  const href = String(url || '');
  requested.push(href);
  if (href.includes('cafe-articleapi/v3')) {
    return new Response('upstream error', { status: 500 });
  }
  if (href.includes('m.cafe.naver.com')) {
    return new Response(
      '<html><body><img data-src="https://post-phinf.pstatic.net/MjAyNjA5MzA_test/fanart.jpg?type=w966"></body></html>',
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('not found', { status: 404 });
};

try {
  const { fetchFanartDetail, extractImages } = require('../lib/fanart-detail.js');
  const detail = await fetchFanartDetail('28908');
  assert.equal(detail.images[0], 'https://post-phinf.pstatic.net/MjAyNjA5MzA_test/fanart.jpg?type=w966');
  assert.ok(requested.some(url => url.includes('m.cafe.naver.com')), 'mobile cafe HTML fallback should be requested');

  const extracted = extractImages('https://ssl.pstatic.net/static/cafe/app.js https://post-phinf.pstatic.net/example/art.jpg?type=w966');
  assert.deepEqual(extracted, ['https://post-phinf.pstatic.net/example/art.jpg?type=w966']);

  const fetchFanart = require('../lib/content-api/fanart.js');
  assert.equal(typeof fetchFanart.normalize, 'function', 'fanart normalizer should be testable');
  const normalized = fetchFanart.normalize({
    articleId: 123,
    subject: 'nested thumb',
    media: {
      thumbnailImageUrl: 'https://cafeptthumb-phinf.pstatic.net/example/nested.jpg?type=w800'
    }
  });
  assert.equal(normalized.thumb, 'https://cafeptthumb-phinf.pstatic.net/example/nested.jpg?type=w800');
  console.log('fanart image fallback regression: ok');
} finally {
  global.fetch = originalFetch;
}
