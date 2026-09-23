import assert from 'node:assert/strict';
import fs from 'node:fs';

const bakHtml=fs.readFileSync(new URL('../chunbak.html',import.meta.url),'utf8');
const bakJs=fs.readFileSync(new URL('../chunbak.js',import.meta.url),'utf8');
const gwaHtml=fs.readFileSync(new URL('../chungwagame.html',import.meta.url),'utf8');
const gwaJs=fs.readFileSync(new URL('../chungwagame.js',import.meta.url),'utf8');
const adapter=fs.readFileSync(new URL('../score-race-multiplayer.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/minigame-multiplayer-api.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigame-multiplayer.css',import.meta.url),'utf8');
const previewWorkflow=fs.readFileSync(new URL('../.github/workflows/minigame-score-multiplayer-preview-smoke.yml',import.meta.url),'utf8');

assert.match(bakHtml,/data-score-multiplayer="chunbak"/,'Chunbak multiplayer entry missing');
assert.match(bakHtml,/minigame-multiplayer\.js[\s\S]*chunbak\.js[\s\S]*score-race-multiplayer\.js/,'Chunbak multiplayer scripts are out of order');
assert.match(bakHtml,/class="chunbak-multiplayer-main" data-score-multiplayer="chunbak"/,'Chunbak standalone multiplayer button missing');
assert.match(bakJs,/let spawnRandom = Math\.random/,'Chunbak seeded gameplay RNG state missing');
assert.match(bakJs,/resetGame\(\{ autoStart = true, random = Math\.random \}/,'Chunbak reset must accept an injected RNG');
assert.match(bakJs,/Core\.pickSpawnStage\(spawnRandom\)/,'Chunbak spawn sequence must use injected RNG');
assert.doesNotMatch(bakJs,/Core\.pickSpawnStage\(Math\.random\)/,'Chunbak must not bypass the seeded spawn RNG');

assert.match(gwaHtml,/data-score-multiplayer="chungwagame"/,'Chungwagame multiplayer entry missing');
assert.match(gwaHtml,/minigame-multiplayer\.js[\s\S]*chungwagame\.js[\s\S]*score-race-multiplayer\.js/,'Chungwagame multiplayer scripts are out of order');
assert.match(gwaJs,/gameRandom=Math\.random/,'Chungwagame seeded gameplay RNG state missing');
assert.match(gwaJs,/function randomValue\(\)\{const r=gameRandom\(\)/,'Chungwagame board generation must use injected RNG');
assert.match(gwaJs,/function startGame\(options=\{\}\)/,'Chungwagame start must accept multiplayer options');
assert.match(gwaJs,/Math\.floor\(gameRandom\(\)\*\(i\+1\)\)/,'Chungwagame shuffle must use gameplay RNG');

for(const game of ['chunbak','chungwagame'])assert.match(adapter,new RegExp(game+':\\{'),'score-race adapter missing '+game);
assert.match(adapter,/120000/,'score race must last 120 seconds');
assert.match(adapter,/status:'completed'/,'timed score race must submit completion');
assert.match(adapter,/room\.startAt\+120000/,'race end must derive from server start time');
assert.match(adapter,/seededRandom\(seed\)/,'score races must start from the shared room seed');\nassert.match(adapter,/refreshInFlight/,'multiplayer refresh must prevent overlapping requests');\nassert.match(adapter,/progressInFlight/,'multiplayer progress sync must prevent overlapping requests');\nassert.match(adapter,/setInterval\(refresh,1000\)/,'room polling should use a lighter one-second cadence');\nassert.match(adapter,/setInterval\(sync,1000\)/,'progress sync should use a lighter one-second cadence');
assert.match(api,/room\.mode==='score120'/,'server needs score-race completion semantics');
assert.match(api,/room\.players\.every\(item=>item\.finished\)/,'score race must wait for both players');
assert.match(api,/aScore>bScore\?a\.id:b\.id/,'score race winner must be chosen by score');
assert.match(css,/\.chunbak-multiplayer-main[\s\S]*min-height:48px/,'Chunbak standalone multiplayer button CSS missing');
assert.match(css,/\.mp-score-hud/,'score-race HUD CSS missing');
assert.match(previewWorkflow,/startsWith\(github\.head_ref, 'ci\/'\)/,'preview smoke must skip internal CI slash branch names');
assert.match(previewWorkflow,/startsWith\(github\.head_ref, 'internal\/'\)/,'preview smoke must skip internal slash branch names');

console.log('minigame score-race multiplayer regression passed');
