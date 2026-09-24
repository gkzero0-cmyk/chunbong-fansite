import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('site-design-system.css');
const shell=read('site-shell.js');
const quality=read('site-quality.css');
const home=read('home-refresh.css');
const activity=read('activity-center.js');
const dataPeriods=read('data-soop-periods-v3.js');
const index=read('index.html');

for(const token of [
  '--text-primary','--text-secondary','--text-muted','--text-meta','--text-disabled',
  '--accent-schedule','--accent-notice','--accent-replay','--accent-clips','--accent-fanart',
  '--accent-youtube','--accent-tarot','--accent-minigames','--accent-history','--accent-data','--accent-calendar'
]) assert.ok(css.includes(token+':'),token+' missing');

assert.match(css,/\[data-theme="light"\]/,'light-mode token override missing');
assert.doesNotMatch(quality,/@import url\("site-design-system\.css"\)/,'global quality layer must not duplicate the shared design stylesheet');
assert.match(index,/href="site-design-system\.css"/,'home must load the shared design stylesheet directly');
assert.match(shell,/is-current-section/,'header must expose current section state');
assert.match(shell,/aria-current/,'header must expose exact current page');
for(const key of ['replay','tarot','minigames','data','schedule','notice','clips','fanart','youtube','history','calendar']){
  assert.ok(css.includes('data-kind="'+key+'"')||css.includes('data-page="'+key+'"'),key+' category mapping missing');
}
assert.match(home,/var\(--accent-replay\)/,'home replay must use shared replay accent');
assert.match(home,/var\(--accent-clips\)/,'home clips must use shared clips accent');
assert.match(activity,/CATEGORY_META/,'activity center must share semantic category mapping');
assert.doesNotMatch(dataPeriods,/<title>\$\{esc\(row\.label\)\}/,'data charts must not emit native SVG point tooltips');

console.log('sitewide visual system regression passed');
