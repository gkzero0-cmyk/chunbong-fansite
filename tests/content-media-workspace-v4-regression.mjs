import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const contentsHtml = read('chunbong-contents.html');
const player = read('content-media-player.js');
const playerCss = read('content-media-player.css');
const mediaCss = read('media-video-layout.css');

assert.match(contentsHtml, /content-media-player\.js\?v=4/, 'content archive must load the new media workspace runtime');
assert.match(player, /archive-media-workspace/, 'content media must use one shared workspace instead of expanding grid rows');
assert.match(player, /insertAdjacentElement\('beforebegin'/, 'shared player must sit above the media grid');
assert.match(player, /vod\.sooplive\.(?:com|co\.kr)/, 'SOOP com and co.kr player URLs must both embed');
assert.match(player, /type=catch/, 'SOOP Catch links must preserve catch playback mode');
assert.match(player, /사이트에서 재생/, 'playable cards must clearly say they play inside the site');
assert.doesNotMatch(playerCss, /archive-inline-media/, 'old post-grid inline player styling must be retired');
assert.match(playerCss, /grid-template-columns:\s*140px\s+minmax\(0,1fr\)/, 'desktop content media cards must be compact horizontal cards');
assert.match(playerCss, /archive-media-workspace/, 'shared workspace must have dedicated styling');

for (const [file, active] of [['vod.html','vod'],['clips.html','clips'],['youtube.html','youtube']]) {
  const html = read(file);
  assert.match(html, /class="media-local-nav"/, `${file} must expose always-visible media navigation`);
  assert.match(html, new RegExp(`data-media-local="${active}"[^>]*aria-current="page"`), `${file} must mark the current media page`);
  assert.match(html, /media-video-layout\.css\?v=3/, `${file} must load the refreshed local-nav stylesheet`);
}
assert.match(mediaCss, /\.media-local-nav/, 'dedicated media pages must style the always-visible local nav');

const require = createRequire(import.meta.url);
const { applyPublicContentCorrections } = require('../lib/content-public-response-corrections.js');
const corrected = applyPublicContentCorrections({ item: {
  id: 'justserver-survival',
  timeline: [{id:'auto-soop-post-208735733',url:'https://www.sooplive.com/station/chunbongtv/post/208735733'}],
  sources: [{id:'source-208735733',url:'https://www.sooplive.com/station/chunbongtv/post/208735733'}],
  media: [
    {id:'survival-presentation-vod-207560243',type:'vod',title:'7시 그냥서버:적자생존 설명회',date:'2026-09-19'},
    {id:'auto-soop-vod-207561839',type:'vod',title:'7시 그냥서버:적자생존 설명회',date:'2026-09-19',thumbnail:'good.jpg'}
  ]
}});
assert.equal(corrected.item.timeline.length, 0, 'private SOOP post must stay suppressed');
assert.equal(corrected.item.sources.length, 0, 'private source must stay suppressed');
assert.deepEqual(corrected.item.media.map(row => row.id), ['auto-soop-vod-207561839'], 'broken duplicate briefing VOD must be removed from public media cards');

console.log('content media workspace v4 regression passed');
