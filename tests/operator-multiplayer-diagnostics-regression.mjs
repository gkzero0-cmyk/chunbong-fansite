import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const multiplayer=fs.readFileSync(new URL('../lib/minigame-multiplayer-api.js',import.meta.url),'utf8');

assert.match(api,/minigameMultiplayer=require\('\.\/minigame-multiplayer-api'\)/);
assert.match(api,/multiplayer:\{\.\.\.minigameMultiplayer\._internals\.getDiagnostics\(\)/);
assert.match(multiplayer,/multiplayerDiagnostics=\{since:/);
assert.match(multiplayer,/roomBusy\+=1/);
assert.match(multiplayer,/lockRetries\+=1/);
assert.match(multiplayer,/redisCircuitRejects\+=1/);
assert.match(api,/progressHeartbeatMilliseconds:5000/);
assert.match(api,/progressDeltaSync:true/);
assert.match(ui,/멀티플레이 delta sync/);
assert.match(ui,/멀티플레이 room_busy/);
assert.match(ui,/멀티플레이 Redis circuit/);

console.log('operator multiplayer diagnostics regression passed');
