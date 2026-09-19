import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const chuntris = read('.github/workflows/chuntris-preview-live-smoke.yml');
const chunbak = read('.github/workflows/chunbak-postgame-preview-live-smoke.yml');

for (const [name, source] of [['chuntris', chuntris], ['chunbak', chunbak]]) {
  assert.match(source, /!startsWith\(github\.head_ref, 'ci-'\)/, name + ' live preview must skip ci-* branches');
  assert.match(source, /!startsWith\(github\.head_ref, 'internal-'\)/, name + ' live preview must skip internal-* branches');
}

for (const token of [
  "      - 'chuntris.html'",
  "      - 'chuntris.js'",
  "      - 'chuntris-postgame-ranking.js'",
  "      - 'api/content.js'",
  "      - 'lib/chuntris-ranking-api.js'"
]) assert.ok(chuntris.includes(token), 'chuntris live smoke missing ' + token);

for (const token of [
  "      - 'chunbak.html'",
  "      - 'chunbak.js'",
  "      - 'chunbak-postgame-ranking.js'",
  "      - 'api/content.js'",
  "      - 'lib/chunbak-ranking-api.js'"
]) assert.ok(chunbak.includes(token), 'chunbak live smoke missing ' + token);

for (const token of ['chuntris.css','chuntris-fullscreen.css','chuntris-immersive.css','chuntris-audio.js','chuntris-ranking-core.js']) {
  assert.ok(!chuntris.includes("      - '" + token + "'"), 'chuntris live smoke should not run for local-only ' + token);
}
for (const token of ['chunbak.css','chunbak-postgame-ranking.css','chunbak-board-start-ui.css','chunbak-audio.js','chunbak-game-core.js','chunbak-ranking-core.js','assets/chunbak/**']) {
  assert.ok(!chunbak.includes("      - '" + token + "'"), 'chunbak live smoke should not run for local-only ' + token);
}

console.log('live preview workflow routing regression passed');
