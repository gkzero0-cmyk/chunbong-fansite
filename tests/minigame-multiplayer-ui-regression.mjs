import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
const multiplayer=fs.readFileSync(new URL('../chuntris-multiplayer.js',import.meta.url),'utf8');
const common=fs.readFileSync(new URL('../minigame-multiplayer.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigame-multiplayer.css',import.meta.url),'utf8');
const apiEntry=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

assert.match(html,/data-chuntris-multiplayer/,'Chuntris start screen needs a multiplayer entry button');
assert.match(html,/minigame-multiplayer\.css/,'shared multiplayer styles missing');
assert.match(html,/minigame-multiplayer\.js[\s\S]*chuntris\.js[\s\S]*chuntris-multiplayer\.js/,'multiplayer scripts must load around Chuntris runtime');
assert.match(runtime,/function startMultiplayer\(seed,multiplayerMode='sprint40'\)/,'Chuntris runtime must expose mode-aware seeded multiplayer start');
assert.match(runtime,/new Engine\.ChuntrisGame\(\{mode,random:seededRandom\(seed\)\}\)/,'multiplayer race must use the shared seed');
assert.match(runtime,/root\.ChuntrisApp=\{start,startMultiplayer,/,'startMultiplayer must be public to the adapter');

assert.match(common,/type=minigame-multiplayer/,'shared client must target multiplayer API');
assert.match(common,/function seededRandom\(seed\)/,'shared client should expose seeded random helper');
assert.match(common,/roomInviteUrl/,'shared client should build invite links');
assert.match(common,/async create\(nickname,mode\)/,'shared client create must accept a room mode');

for(const marker of ['action:\'create\'','action:\'join\'','action:\'ready\'','action:\'progress\'','action:\'rematch\'','action:\'leave\'']){
  assert.ok(common.includes(marker),'shared client action missing: '+marker);
}
for(const mode of ['classic','sprint40','hard']) assert.match(multiplayer,new RegExp(`data-mp-chuntris-mode="${mode}"`),'Chuntris multiplayer mode missing: '+mode);
assert.match(multiplayer,/client\.create\(normalizeName\(\),selectedMode\)/,'room creation must send the selected Chuntris mode');
assert.match(multiplayer,/setInterval\(refresh,700\)/,'room should poll frequently enough for live progress');
assert.match(multiplayer,/setInterval\(send,650\)/,'local race progress should be synced');
assert.match(multiplayer,/App\.startMultiplayer\?\.\(room\.seed,room\.mode\)/,'server room seed and mode must start the local race');
assert.match(multiplayer,/data-mp-rematch/,'postgame rematch action missing');
assert.match(multiplayer,/navigator\.clipboard\.writeText/,'invite link copy support missing');
assert.match(css,/\.mp-shell\{/,'multiplayer lobby shell styles missing');
assert.match(css,/\.mp-hud\{/,'opponent progress HUD styles missing');
assert.match(css,/\.mp-mode-picker/,'multiplayer mode picker styles missing');

assert.match(apiEntry,/handleMinigameMultiplayer/,'content API must import multiplayer handler');
assert.match(apiEntry,/type==='minigame-multiplayer'/,'content API must route multiplayer requests');

console.log('minigame multiplayer UI regression passed');
