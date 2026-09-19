import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

const content=read('content.js');
const page=read('page.js');
const activity=read('activity-center.js');
const styles=read('styles.css');
const gameLayout=read('game-layout.css');
const quality=read('site-quality.css');
const index=read('index.html');
const minigames=read('minigames.html');
const robots=read('robots.txt');
const sitemap=read('sitemap.xml');

assert.match(content,/ChunbongCache/);
assert.match(content,/nav-group/);
assert.match(content,/minigames:\s*\[/);
assert.match(page,/notionScheduleUpdatedAt/);
assert.match(page,/ChunbongCache/);
assert.match(activity,/document\.hidden/);
assert.match(activity,/ChunbongCache/);

assert.match(quality,/:focus-visible/);
assert.match(quality,/prefers-reduced-motion:reduce/);
assert.match(quality,/nav-group-submenu/);
assert.match(gameLayout,/Shared minigame layout system/);
assert.match(gameLayout,/\.chuntris-page/);
assert.match(gameLayout,/\.chunbak-play-top/);
assert.match(gameLayout,/\.chungwagame-page/);
assert.match(gameLayout,/\.chuncortile-page/);
assert.match(gameLayout,/max-height:900px/);

assert.doesNotMatch(styles,/\/\* Chuntris \*\/[\s\S]*chuntris-stage-height/);
assert.match(index,/SOOP 공식 프로필/);
assert.match(index,/춘트리스·춘박게임·춘과게임·춘컬타일/);
assert.match(minigames,/클래식 무한 · 40줄 타임어택 · 3분 점수전/);
assert.match(robots,/sitemap\.xml/);
assert.match(sitemap,/chuncortile\.html/);

console.log('site quality regression: ok');
