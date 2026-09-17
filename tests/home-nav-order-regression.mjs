import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cardPattern = /<a class="portal-card reveal" href="([^"]+)"><small>(\d{2}) \/ ([^<]+)<\/small><strong>([^<]+)<\/strong>/g;
const cards = [...index.matchAll(cardPattern)].map(match => ({ href: match[1], number: match[2], label: match[3], title: match[4] }));
assert.deepEqual(cards.map(card => [card.number, card.href, card.title]), [
  ['01', 'schedule.html', '방송 일정'],
  ['02', 'notice.html', '공지'],
  ['03', 'vod.html', '다시보기'],
  ['04', 'clips.html', '핫클립'],
  ['05', 'fanart.html', '팬아트'],
  ['06', 'youtube.html', '유튜브'],
  ['07', 'tarot.html', '타로 보기'],
  ['08', 'minigames.html', '미니게임'],
  ['09', 'history.html', '춘봉 방송 이력'],
  ['10', 'data.html', '춘봉 데이터']
], 'home portal numbering/order must put minigames at 08 and data at 10');

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

console.log('home card and navigation order regression passed');
