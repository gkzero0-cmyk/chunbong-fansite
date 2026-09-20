import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('minigames.html');
const js=read('minigame-profile.js');
const css=read('minigame-profile.css');
const sw=read('service-worker.js');

assert.doesNotThrow(()=>new Function(js),'minigame profile runtime must remain valid JavaScript');
assert.match(html,/data-minigame-profile/,'minigames hub must include local record profile');
assert.ok(html.indexOf('class="minigame-grid"') < html.indexOf('data-minigame-profile'),'game choices should appear before personal records');
assert.match(html,/data-record="chuntris"/);
assert.match(html,/data-record="chunbak"/);
assert.match(html,/data-record="chungwa"/);
assert.match(html,/data-record="chuncortile"/);
assert.match(html,/data-profile-total-plays/,'minigame profile must show total play count');
assert.match(html,/data-profile-achievements/,'minigame profile must show earned achievement count');
assert.match(html,/data-profile-recent/,'minigame profile must show most recent game');
assert.match(html,/data-profile-achievement-list/,'minigame profile must expose achievement badges');
assert.match(html,/src="minigame-profile\.js"/,'minigames hub must load profile runtime');
assert.match(html,/href="minigame-profile\.css"/,'minigames hub must load profile styles');

for(const key of [
  'chuntris.bestScore.classic.v1',
  'chuntris.bestTime.sprint40.v1',
  'chuntris.bestScore.score180.normal.v1',
  'chunbak:best:v1',
  'chungwagame-best-v2',
  'chuncortile.best.v1'
]){
  assert.ok(js.includes(key),'profile missing local record key '+key);
}
assert.match(js,/textContent=value/,'profile must render stored values via textContent');
assert.match(js,/window\.addEventListener\('storage',render\)/,'profile must refresh across tabs');
assert.match(js,/visibilitychange/,'profile must refresh when returning from a game');
assert.match(js,/ChunbongPersonal\?\.gameSnapshot/,'profile must merge personal play history and achievements');
assert.match(js,/chunbong:personal-updated/,'profile must refresh when personal game history changes');
assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'desktop record grid must show four games');
assert.match(css,/\.minigame-profile-extra/,'unified profile extra stat styles missing');
assert.match(css,/\.minigame-achievement-strip/,'achievement badge strip styles missing');
assert.match(css,/@media\(max-width:640px\)/,'record profile must have a mobile layout');
assert.match(sw,/chunbong-pwa-20260920-v20/,'PWA cache must advance for minigame profile');
assert.match(sw,/minigame-profile\.js/,'PWA must cache profile runtime');
assert.match(sw,/minigame-profile\.css/,'PWA must cache profile styles');

assert.match(html,/data-profile-streak/,'daily challenge streak stat missing');
assert.match(html,/data-profile-daily-challenge/,'daily challenge card missing');
assert.match(js,/ChunbongPersonal\?\.dailyChallenge/,'profile must render the daily challenge');
console.log('minigame local profile regression passed');