import fs from 'node:fs';
import assert from 'node:assert/strict';
const audio = fs.readFileSync(new URL('../chuntris-audio.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const event of ['harddrop','single','double','triple','quad']) assert.ok(audio.includes(`'${event}'`), event);
for (const event of ['harddrop','single','double','triple','quad']) assert.ok(app.includes(`play('${event}')`) || app.includes(`play(clearSound)`), `dispatch ${event}`);
assert.ok(!app.includes("root.ChuntrisAudio.play('tetris')"), 'generic tetris clear audio must not double-trigger');
assert.ok(!app.includes("root.ChuntrisAudio.play('line')"), 'generic line clear audio must not double-trigger');
console.log('chuntris audio effects regression passed');
