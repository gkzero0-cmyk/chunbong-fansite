import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const featuredPattern = /<a class="portal-card reveal" href="([^"]+)"><small>(\d{2}) \/ ([^<]+)<\/small><strong>([^<]+)<\/strong>/g;
const featured = [...index.matchAll(featuredPattern)].map(match => ({ href: match[1], number: match[2], label: match[3], title: match[4] }));
assert.deepEqual(featured.map(card => [card.number, card.href, card.title]), [
  ['03', 'vod.html', '다시보기'],
  ['07', 'tarot.html', '춘봉 타로'],
  ['08', 'minigames.html', '미니게임'],
  ['10', 'data.html', '춘봉 데이터']
], 'home must emphasize the four primary destinations');

const compactStart=index.indexOf('<nav class="portal-compact-grid');
const compactEnd=index.indexOf('</nav>',compactStart);
assert.ok(compactStart>=0&&compactEnd>compactStart,'home must include compact secondary navigation');
const compact=index.slice(compactStart,compactEnd);
for(const [number,href,title] of [
  ['01','schedule.html','방송 일정'],
  ['02','notice.html','공지'],
  ['04','clips.html','핫클립'],
  ['05','fanart.html','팬아트'],
  ['06','youtube.html','유튜브'],
  ['09','history.html','방송 이력']
]){
  assert.ok(compact.includes(`href="${href}"`),`compact home navigation must include ${href}`);
  assert.ok(compact.includes(`<small>${number}</small>`),`compact home navigation must preserve item ${number}`);
  assert.ok(compact.includes(`<strong>${title}</strong>`),`compact home navigation must include ${title}`);
}

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
