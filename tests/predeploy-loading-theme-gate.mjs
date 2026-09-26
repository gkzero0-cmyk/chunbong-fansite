import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const pages=['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','chunbong-contents.html','history.html','data.html'];

const heavyPageRuntimes=[
  'tarot-bundle.js','chunbong-contents.js','data-core.js','data-soop-periods-v3.js',
  'operator.js','operator-contents.js','chuntris.js','chunbak.js','chungwagame.js','chuncortile.js'
];
for(const page of pages){
  const html=read(page);
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(match=>match[1].split(/[?#]/)[0]);
  const styles=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/gi)].map(match=>match[1].split(/[?#]/)[0]);
  assert.equal(new Set(scripts).size,scripts.length,page+' loads a script more than once');
  assert.equal(new Set(styles).size,styles.length,page+' loads a stylesheet more than once');

  for(const runtime of heavyPageRuntimes){
    const allowed=
      (runtime==='tarot-bundle.js'&&page==='tarot.html')||
      (runtime==='chunbong-contents.js'&&page==='chunbong-contents.html')||
      ((runtime==='data-core.js'||runtime==='data-soop-periods-v3.js')&&page==='data.html');
    if(!allowed) assert.ok(!scripts.includes(runtime),page+' must not eagerly load unrelated heavy runtime '+runtime);
  }
}

const design=read('site-design-system.css');
for(const token of ['--text-primary','--text-secondary','--text-muted','--text-meta','--text-disabled']){
  assert.match(design,new RegExp(token+':#[0-9A-Fa-f]{6}'),token+' dark token must use an explicit auditable color');
}
assert.match(design,/\[data-theme="light"\][\s\S]*--text-primary:/,'light theme text tokens missing');
assert.match(design,/\[data-theme="light"\][\s\S]*--accent-contents:/,'light theme semantic accents missing');

console.log('predeploy loading and theme guard passed');
