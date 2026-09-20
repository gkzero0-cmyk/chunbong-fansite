import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const featuredPattern = /<a class="portal-card reveal" data-kind="([^"]+)" href="([^"]+)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g;
const featured = [...index.matchAll(featuredPattern)].map(match => ({ kind: match[1], href: match[2], label: match[3], title: match[4] }));
assert.deepEqual(featured.map(card => [card.kind, card.href, card.label, card.title]), [
  ['replay', 'vod.html', 'REPLAY', '다시보기'],
  ['tarot', 'tarot.html', 'TAROT', '타로 보기'],
  ['minigames', 'minigames.html', 'MINIGAMES', '미니게임'],
  ['data', 'data.html', 'DATA', '춘봉 데이터']
], 'home must emphasize the four primary destinations with semantic labels');

const compactStart=index.indexOf('<nav class="portal-compact-grid');
const compactEnd=index.indexOf('</nav>',compactStart);
assert.ok(compactStart>=0&&compactEnd>compactStart,'home must include compact secondary navigation');
const compact=index.slice(compactStart,compactEnd);
for(const [kind,href,title] of [
  ['schedule','schedule.html','방송 일정'],
  ['notice','notice.html','공지'],
  ['clips','clips.html','핫클립'],
  ['fanart','fanart.html','팬아트'],
  ['youtube','youtube.html','유튜브'],
  ['history','history.html','방송 이력']
]){
  assert.ok(compact.includes(`href="${href}" data-kind="${kind}"`),`compact home navigation must include semantic ${kind} destination`);
  assert.ok(compact.includes(`<strong>${title}</strong>`),`compact home navigation must include ${title}`);
}
assert.doesNotMatch(compact, /<small>\d{2}<\/small>/, 'compact home navigation must not use fixed numeric ordering');

const allHomeDestinations=['schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','history.html','data.html'];
for(const href of allHomeDestinations){
  assert.ok(index.includes(`href="${href}"`),`home must preserve destination ${href}`);
}

const pages = ['index','schedule','notice','vod','clips','fanart','youtube','tarot','minigames','chuntris','chunbak','history','data'];
for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  const navStart = html.indexOf('<nav class="main-nav"');
  const navEnd = html.indexOf('</nav>', navStart);
  assert.ok(navStart >= 0 && navEnd > navStart, `${page}.html must contain main nav`);
  const nav = html.slice(navStart, navEnd);
  const fanart = nav.indexOf('href="fanart.html">팬아트</a>');
  const youtube = nav.indexOf('href="youtube.html">유튜브</a>');
  const tarot = nav.indexOf('href="tarot.html">TAROT</a>');
  const minigames = nav.indexOf('href="minigames.html">미니게임</a>');
  assert.ok(fanart >= 0 && youtube > fanart && tarot > youtube && minigames > tarot,
    `${page}.html nav must order 팬아트 → 유튜브 → TAROT → 미니게임`);
}

console.log('home focused hierarchy and navigation order regression passed');
