import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const originalFetch = global.fetch;
const requested = [];
const listThumb = 'https://cafeptthumb-phinf.pstatic.net/example/list-art.jpg?type=w800';
const htmlThumb = 'https://post-phinf.pstatic.net/MjAyNjA5MzA_test/html-art.jpg?type=w966';

global.fetch = async url => {
  const href = String(url || '');
  requested.push(href);
  if (href.includes('cafe-articleapi/v3')) {
    return new Response('upstream error', { status: 500 });
  }
  if (href.includes('cafe-boardlist-api/v1')) {
    return Response.json({
      result: {
        articles: [{
          articleId: 28908,
          subject: 'list fallback art',
          media: { thumbnailImageUrl: listThumb }
        }]
      }
    });
  }
  if (href.includes('m.cafe.naver.com')) {
    return new Response(
      `<html><head><link rel="icon" href="https://ca-fe.pstatic.net/web-mobile/static/img/favicon.png"></head><body><img data-src="${htmlThumb}"></body></html>`,
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('not found', { status: 404 });
};

try {
  const { fetchFanartDetail, extractImages } = require('../lib/fanart-detail.js');

  const detailFromList = await fetchFanartDetail('28908');
  assert.equal(detailFromList.images[0], listThumb);
  assert.equal(detailFromList.source, 'fanart-list');
  assert.ok(!requested.some(url => url.includes('m.cafe.naver.com')), 'list thumbnail should prevent unnecessary HTML fallback');

  const detailFromHtml = await fetchFanartDetail('28909');
  assert.equal(detailFromHtml.images[0], htmlThumb);
  assert.equal(detailFromHtml.source, 'public-html');
  assert.ok(requested.some(url => url.includes('m.cafe.naver.com')), 'mobile cafe HTML fallback should still work when list has no matching article');

  const extracted = extractImages([
    '<img src="https://ca-fe.pstatic.net/web-mobile/static/img/favicon.png">',
    '<img src="https://ssl.pstatic.net/static/cafe/logo.png">',
    `<img data-src="${htmlThumb}">`
  ].join(''));
  assert.deepEqual(extracted, [htmlThumb]);

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
