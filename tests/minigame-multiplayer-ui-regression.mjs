import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
const multiplayer=fs.readFileSync(new URL('../chuntris-multiplayer.js',import.meta.url),'utf8');
const scoreRace=fs.readFileSync(new URL('../score-race-multiplayer.js',import.meta.url),'utf8');
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


const sandbox={URL,location:{origin:'https://chunbong-fansite.vercel.app',href:'https://chunbong-fansite.vercel.app/chuntris.html'}};
vm.runInNewContext(common,sandbox);
const normalizeRoomCode=sandbox.MinigameMultiplayer.normalizeRoomCode;
assert.equal(normalizeRoomCode('VER984'),'VER984');
assert.equal(normalizeRoomCode('https://chunbong-fansite.vercel.app/chuntris.html?room=VER984'),'VER984');
assert.equal(normalizeRoomCode('https://chunbong-fansite.vercel.app/chunbak.html?foo=1&room=ABC234&bar=2'),'ABC234');
assert.equal(normalizeRoomCode('초대 링크: https://chunbong-fansite.vercel.app/chungwagame.html?room=QWE789'),'QWE789');
assert.equal(normalizeRoomCode('https://chunbong-fansite.vercel.app/chuntris.html'),'','URL without room code must not become HTTPS');
assert.equal(normalizeRoomCode('방 코드: ZXC567'),'ZXC567');

for(const source of [multiplayer,scoreRace]){
  assert.doesNotMatch(source,/data-mp-code maxlength="6"/,'room input must not truncate a pasted invite URL before parsing');
  assert.match(source,/data-mp-code autocomplete="off" autocapitalize="characters" spellcheck="false"/,'room input must accept full invite URLs');
  assert.match(source,/addEventListener\('paste'/,'room input must explicitly parse pasted invite URLs');
  assert.match(source,/MinigameMultiplayer\.normalizeRoomCode/,'room input must use the shared room-code parser');
  assert.match(source,/roomCode\.length!==6/,'join must validate the parsed six-character room code');
}
assert.match(common,/async join\(nextCode,nickname\)\{const data=await post\(\{action:'join',code:normalizeRoomCode\(nextCode\),nickname\}\)/,'client join must normalize room codes defensively');
console.log('normalizeRoomCode paste regression passed');
