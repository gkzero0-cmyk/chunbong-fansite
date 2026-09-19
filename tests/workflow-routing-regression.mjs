import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const pwa = read('.github/workflows/pwa-browser-smoke.yml');
const dday = read('.github/workflows/home-dday-pr-browser-smoke.yml');
const cortile = read('.github/workflows/chuncortile-browser-smoke.yml');
const chungwa = read('.github/workflows/chungwagame-pr-browser-smoke.yml');
const vercel = JSON.parse(read('vercel.json'));

assert.doesNotMatch(pwa, /- '\*\.html'/, 'PWA browser smoke must not run for every HTML edit');
assert.match(pwa, /- 'index\.html'/, 'PWA smoke must still cover the install entry page');
assert.match(pwa, /- 'offline\.html'/, 'PWA smoke must still cover the offline fallback');
assert.match(pwa, /- 'assets\/app-icon\.\*'/, 'PWA icon variants must trigger browser smoke');
assert.match(pwa, /- 'vercel\.json'/, 'PWA deployment header changes must trigger browser smoke');

assert.doesNotMatch(dday, /tarot\.html|tarot-hero-banner\.css|tarotLink/, 'Home D-day smoke must not own Tarot validation');
assert.match(dday, /index\.html/);
assert.match(dday, /home-dday\.js/);

assert.doesNotMatch(cortile, /- 'minigames\.html'/, 'Chuncortile smoke must not run for hub-only edits');
assert.doesNotMatch(cortile, /- 'content\.js'/, 'Chuncortile smoke must not run for general content-bundle edits');
assert.match(cortile, /- 'chuncortile\.html'/);
assert.match(cortile, /- 'chuncortile\.js'/);

assert.doesNotMatch(chungwa, /- 'minigames\.html'/, 'Chungwagame smoke must not run for hub-only edits');
assert.match(chungwa, /- 'chungwagame\.html'/);
assert.match(chungwa, /- 'chungwagame\.js'/);

assert.equal(vercel.git?.deploymentEnabled?.['ci-*'], false, 'CI-only branches must stay excluded from Vercel deployments');

console.log('workflow routing regression passed');
