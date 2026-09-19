import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const core = read('page.js');

assert.match(core, /window\.ChunbongPageCore/, 'shared page core must be exposed');
assert.ok(core.length < 12000, `shared page core should stay lightweight: ${core.length} chars`);
for (const token of ['renderSchedulePage','renderNoticePage','renderClipsPage','renderYoutubePage','renderFanartPage']) {
  assert.doesNotMatch(core, new RegExp(token), token + ' must not ship in the shared home runtime');
}

const runtimeByPage = {
  'schedule.html':'page-schedule.js',
  'notice.html':'page-notice.js',
  'vod.html':'page-media.js',
  'clips.html':'page-media.js',
  'youtube.html':'page-media.js',
  'fanart.html':'page-fanart.js'
};
for (const [htmlFile, runtime] of Object.entries(runtimeByPage)) {
  const html = read(htmlFile);
  assert.match(
    html,
    new RegExp('<script src="page\\.js\\?v=2"></script><script src="' + runtime.replace('.', '\\.') + '\\?v=1"></script>'),
    htmlFile + ' must load its runtime after page.js'
  );
}
const home = read('index.html');
for (const runtime of new Set(Object.values(runtimeByPage))) {
  assert.doesNotMatch(home, new RegExp(runtime.replace('.', '\\.')), 'home must not load ' + runtime);
}

assert.match(read('page-schedule.js'), /renderSchedulePage/);
assert.match(read('page-notice.js'), /renderNoticePage/);
assert.match(read('page-media.js'), /renderYoutubePage/);
assert.match(read('page-fanart.js'), /renderFanartPage/);

console.log('page runtime split regression passed');
