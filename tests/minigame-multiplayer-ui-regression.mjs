import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
const multiplayer=fs.readFileSync(new URL('../chuntris-multiplayer.js',import.meta.url),'utf8');
const common=fs.readFileSync(new URL('../minigame-multiplayer.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigame-multiplayer.css',import.meta.url),'utf8');
const apiEntry=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

assert.match(html,/data-chuntris-multiplayer/);
assert.match(html,/minigame-multiplayer\.css/);
assert.match(runtime,/function startMultiplayer\(seed,multiplayerMode='sprint40',multiplayerDifficulty='normal'\)/);
assert.match(runtime,/new Engine\.ChuntrisGame\(\{mode,difficulty,random:seededRandom\(seed\)\}\)/);
assert.match(runtime,/root\.ChuntrisApp=\{start,startMultiplayer,/);

assert.match(common,/type=minigame-multiplayer/);
assert.match(common,/function seededRandom\(seed\)/);
assert.match(common,/roomInviteUrl/);
assert.match(common,/async create\(nickname,mode,difficulty\)/);
for(const marker of ["action:'create'","action:'join'","action:'ready'","action:'progress'","action:'rematch'","action:'leave'"])assert.ok(common.includes(marker),marker);

for(const mode of ['classic','sprint40','score180'])assert.match(multiplayer,new RegExp(`data-mp-chuntris-mode="${mode}"`),mode);
for(const difficulty of ['normal','hard','extreme'])assert.match(multiplayer,new RegExp(`data-mp-chuntris-difficulty="${difficulty}"`),difficulty);
assert.doesNotMatch(multiplayer,/data-mp-chuntris-mode="hard"/,'hard is now difficulty, not multiplayer mode');
assert.match(multiplayer,/client\.create\(normalizeName\(\),selectedMode,selectedDifficulty\)/);
assert.match(multiplayer,/App\.startMultiplayer\?\.\(room\.seed,room\.mode,room\.difficulty\|\|'normal'\)/);
assert.match(multiplayer,/setInterval\(refresh,650\)/);
assert.match(multiplayer,/setInterval\(send,550\)/);
assert.match(multiplayer,/data-mp-rematch/);
assert.match(multiplayer,/navigator\.clipboard\.writeText/);
assert.match(css,/\.mp-shell\{/);
assert.match(css,/\.mp-hud\{/);
assert.match(css,/\.mp-difficulty-picker/);
assert.match(apiEntry,/handleMinigameMultiplayer/);
assert.match(apiEntry,/type==='minigame-multiplayer'/);
console.log('minigame multiplayer UI regression passed');
