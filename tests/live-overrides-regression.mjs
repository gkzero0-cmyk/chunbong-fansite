import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const runtime = read('live-fixes.js');
const schedule = read('schedule.html');
const clips = read('clips.html');

assert.ok(schedule.includes('live-fixes.js'), 'schedule should load live fixes after base renderer');
assert.ok(clips.includes('live-fixes.js'), 'clips should load live fixes after base renderer');
assert.ok(runtime.includes("/api/content?type=schedule"), 'schedule override should fetch live schedule data');
assert.doesNotMatch(runtime, /data-official-snapshot|#schedule-official/, 'removed official schedule must not be recreated by live fixes');
assert.doesNotMatch(runtime, /catch-detail|hls\.js|playCatch\s*\(/, 'live fixes must not replace the official CATCH player with direct CDN playback');
assert.ok(clips.includes('id="clip-video"'), 'Catch page should keep its native video fallback element');

console.log('live schedule override and official Catch playback regression test passed');
