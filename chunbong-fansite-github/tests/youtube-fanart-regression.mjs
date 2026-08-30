import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contentPath = require.resolve('../api/content.js');

function json(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}
function html(payload, ok = true, status = 200) {
  return { ok, status, text: async () => payload, json: async () => { throw new Error('not json'); } };
}

async function run(type, fetchImpl) {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/api/')) delete require.cache[key];
  }
  global.fetch = fetchImpl;
  const handler = require(contentPath);
  let body;
  const res = { setHeader() {}, status() { return this; }, json(payload) { body = payload; return payload; } };
  await handler({ query: { type } }, res);
  return body;
}

// Fanart should fall back to the legacy mobile JSON endpoint when the new SPA list is blocked.
{
  const calls = [];
  const body = await run('fanart', async (url) => {
    const value = String(url); calls.push(value);
    if (value.includes('cafe-boardlist-api')) return json({ error: { code: 'LOGIN_REQUIRED' } }, false, 400);
    if (value.includes('ArticleListV2dot1.json')) {
      return json({ message: { result: { articleList: [
        { item: { articleId: 7001, menuId: 18, subject: '레거시 팬아트', writerNickname: '그림러', writeDateTimestamp: 1788048000000, thumbnailImageUrl: 'https://cafeptthumb-phinf.pstatic.net/test.jpg' } }
      ] } } });
    }
    return json({}, false, 404);
  });
  assert.equal(body.items.length, 1, 'fanart should use a legacy list fallback');
  assert.equal(body.items[0].title, '레거시 팬아트');
  assert.match(body.items[0].thumb, /pstatic\.net/);
  assert.ok(calls.some(url => url.includes('ArticleListV2dot1.json')), 'legacy ArticleListV2dot1 endpoint should be attempted');
}

// YouTube should return separate latest video/short groups, capped at 12, with embeddable links.
{
  const makeVideo = (i) => ({ videoRenderer: {
    videoId: `video${String(i).padStart(6, '0')}`.slice(0, 11),
    title: { runs: [{ text: `동영상 ${i}` }] },
    publishedTimeText: { simpleText: `${i}일 전` },
    viewCountText: { simpleText: `조회수 ${i}회` },
    thumbnail: { thumbnails: [{ url: `https://i.ytimg.com/vi/video${i}/hqdefault.jpg`, width: 480, height: 360 }] }
  }});
  const makeShort = (i) => ({ shortsLockupViewModel: {
    onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: `short${String(i).padStart(6, '0')}`.slice(0, 11) } } },
    overlayMetadata: { primaryText: { content: `쇼츠 ${i}` }, secondaryText: { content: `조회수 ${i}회` } },
    thumbnail: { sources: [{ url: `https://i.ytimg.com/vi/short${i}/hqdefault.jpg`, width: 405, height: 720 }] }
  }});
  const body = await run('youtube', async (url) => {
    const value = String(url);
    if (value.includes('/videos')) return html(`<script>var ytInitialData = ${JSON.stringify({items:Array.from({length:15},(_,i)=>makeVideo(i+1))})};</script>`);
    if (value.includes('/shorts')) return html(`<script>var ytInitialData = ${JSON.stringify({items:Array.from({length:15},(_,i)=>makeShort(i+1))})};</script>`);
    return html('', false, 404);
  });
  assert.ok(body.groups, 'youtube response should expose groups');
  assert.equal(body.groups.videos.length, 12, 'latest videos should be capped at 12');
  assert.equal(body.groups.shorts.length, 12, 'latest Shorts should be capped at 12');
  assert.match(body.groups.videos[0].embed, /^https:\/\/www\.youtube\.com\/embed\//);
  assert.equal(body.groups.shorts[0].kind, 'shorts');
}

const pages = ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html'];
for (const file of pages) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.ok(source.includes('youtube.html'), `${file} should include a YouTube navigation link`);
}
const youtubeHtml = fs.readFileSync(new URL('../youtube.html', import.meta.url), 'utf8');
const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');
assert.ok(youtubeHtml.includes('data-youtube-kind="videos"'), 'YouTube page should include video tab');
assert.ok(youtubeHtml.includes('data-youtube-kind="shorts"'), 'YouTube page should include Shorts tab');
assert.ok(pageJs.includes("youtube: '/api/content?type=youtube'"), 'page JS should load YouTube API');
assert.ok(pageJs.includes('/api/image?url='), 'fanart images should use the local image proxy');

console.log('youtube/fanart regression test passed');
