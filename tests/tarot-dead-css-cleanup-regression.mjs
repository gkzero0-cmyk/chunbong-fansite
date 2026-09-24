import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('tarot.html');
const css=read('tarot.css');

assert.match(html,/href="tarot-bundle\.css\?v=1"/,'tarot page must load the generated bundled stylesheet');
assert.doesNotMatch(html,/tarot-effects-v2\.css/,'unused reveal stylesheet must not load');
assert.ok(!fs.existsSync(new URL('../tarot-effects-v2.css',import.meta.url)),'unused reveal stylesheet file must stay deleted');

for(const token of ['tarot-card-art is-missing','tarot-ai-overall','tarot-ai-cards','tarot-ai-card-reading','tarot-ai-card-position']){
  assert.ok(!css.includes(token),'retired tarot selector must stay deleted: '+token);
}
for(const token of ['.tarot-stage','.tarot-card-back','.tarot-card-art','.tarot-reading-grid','.tarot-ai-panel','.tarot-ai-content','@keyframes tarotShuffle','@keyframes tarotReveal']){
  assert.ok(css.includes(token),'active tarot styling must remain: '+token);
}
assert.ok(Buffer.byteLength(css,'utf8')<14000,'tarot.css must remain below the cleaned 14KB source budget');

console.log('tarot dead CSS cleanup regression passed');
