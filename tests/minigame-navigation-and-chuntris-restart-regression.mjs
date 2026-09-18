import fs from 'node:fs';
import assert from 'node:assert/strict';

const chuntrisHtml = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const chuntrisJs = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const chuntrisCss = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');
const chunbakHtml = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const chunbakCss = fs.readFileSync(new URL('../chunbak.css', import.meta.url), 'utf8');

assert.ok(chuntrisHtml.includes('href="minigames.html"') && chuntrisHtml.includes('미니게임으로 돌아가기'), 'Chuntris hero must link back to minigames');
assert.ok(chunbakHtml.includes('href="minigames.html"') && chunbakHtml.includes('미니게임으로 돌아가기'), 'Chunbak hero must link back to minigames');
assert.ok(chuntrisCss.includes('.minigame-back-link'), 'Chuntris back link must have responsive hero styling');
assert.ok(chunbakCss.includes('.minigame-back-link'), 'Chunbak back link must have responsive hero styling');

assert.ok(chuntrisHtml.includes('id="chuntris-overlay-restart"'), 'terminal overlay must expose a restart button');
assert.ok(chuntrisHtml.includes('onclick="ChuntrisApp.start()"'), 'terminal restart button must immediately start another run');
assert.ok(chuntrisJs.includes('root.ChuntrisApp={start,'), 'terminal restart must reuse the existing public start/reset flow');
assert.ok(chuntrisJs.includes("if(['playing','paused','gameover','completed'].includes(game.getSnapshot().status))game.reset(mode,difficulty)"), 'public start flow must reset terminal games while preserving the selected mode and difficulty');

console.log('minigame navigation and Chuntris restart regression passed');
