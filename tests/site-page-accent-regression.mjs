import assert from 'node:assert/strict';
import fs from 'node:fs';

const pages={
  schedule:['SCHEDULE','◷'],
  notice:['NOTICE','!'],
  vod:['REPLAY','▶'],
  clips:['HOT CLIP','⚡'],
  fanart:['FAN ART','✦'],
  youtube:['YOUTUBE','▷'],
  tarot:['TAROT','✧'],
  minigames:['MINI GAMES','◆'],
  history:['BROADCAST HISTORY','↺'],
  data:['DATA','▥']
};

for(const [name,[tag,icon]] of Object.entries(pages)){
  const html=fs.readFileSync(new URL('../'+name+'.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/class="kicker"[^>]*>\s*\d{2}\s*\//,name+' must not use decorative menu numbers');
  assert.ok(html.includes('page-category-kicker'),name+' must expose shared page category kicker');
  assert.ok(html.includes(icon),name+' must expose its category icon');
  assert.ok(html.includes(tag),name+' must expose its semantic category tag');
}

const css=fs.readFileSync(new URL('../site-design-system.css',import.meta.url),'utf8');
for(const page of ['schedule','notice','vod','clips','fanart','youtube','tarot','minigames','history','data']){
  assert.ok(css.includes('body[data-page="'+page+'"]'),page+' page accent mapping missing');
}
console.log('site page accent regression passed');
