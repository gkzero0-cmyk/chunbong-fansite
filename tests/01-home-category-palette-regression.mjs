import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../home-refresh.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

for(const [kind,token] of [
 ['replay','--accent-replay'],['tarot','--accent-tarot'],['minigames','--accent-minigames'],['data','--accent-data'],
 ['schedule','--accent-schedule'],['notice','--accent-notice'],['clips','--accent-clips'],['fanart','--accent-fanart'],
 ['youtube','--accent-youtube'],['history','--accent-history'],['calendar','--accent-calendar']
]){
  assert.ok(css.includes('data-kind="'+kind+'"]{--')&&css.includes('var('+token+')'),kind+' must use shared category accent');
}
assert.match(css,/portal-card[data-kind="tarot"] small::before{content:"✧"}/);
assert.match(html,/href="clips.html" data-kind="clips"><small aria-hidden="true">⚡</small>/);
assert.match(css,/portal-card strong[sS]*var(--text-primary)/);
assert.match(css,/portal-card p[sS]*var(--text-secondary)/);
console.log('home category palette regression passed');
