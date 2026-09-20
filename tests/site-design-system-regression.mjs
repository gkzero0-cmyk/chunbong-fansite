import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../site-design-system.css',import.meta.url),'utf8');
const quality=fs.readFileSync(new URL('../site-quality.css',import.meta.url),'utf8');

for(const token of [
  '--text-primary','--text-secondary','--text-muted','--text-meta','--text-disabled',
  '--accent-schedule','--accent-notice','--accent-replay','--accent-clips','--accent-fanart',
  '--accent-youtube','--accent-tarot','--accent-minigames','--accent-history','--accent-data','--accent-calendar'
]) assert.ok(css.includes(token+':'),token+' missing');

assert.match(css,/\[data-theme="light"\]/);
assert.match(css,/\.category-accent\[data-kind="calendar"\]/);
assert.match(quality,/@import url\("site-design-system\.css"\)/);

const rootBlock=(css.match(/:root\{([\s\S]*?)\}/)||[])[1]||'';
const dark=[...rootBlock.matchAll(/--accent-(schedule|notice|replay|clips|fanart|youtube|tarot|minigames|history|data|calendar):\s*(#[0-9a-fA-F]{6})/g)].map(m=>m[2].toLowerCase());
assert.equal(dark.length,11,'all dark category accents must be declared in :root');
assert.equal(new Set(dark).size,11,'all dark category accents must be distinct');

console.log('site design system regression passed');
