import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../chungwagame.html',import.meta.url),'utf8');const js=fs.readFileSync(new URL('../chungwagame.js',import.meta.url),'utf8');const post=fs.readFileSync(new URL('../chungwagame-postgame-ranking.js',import.meta.url),'utf8');
assert.equal(html.includes('id="cg-nickname"'),false,'must not ask for nickname before game');
for(const id of ['cg-ranking-register','cg-ranking-submit-panel','cg-ranking-nickname','cg-ranking-submit','cg-ranking-cancel'])assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
assert.ok(html.includes('chungwagame-postgame-ranking.js'));
assert.equal(js.includes('submitTerminalRanking'),false,'game runtime must not auto-submit ranking');
assert.ok(js.includes("localStorage.setItem(BEST_KEY,String(best))"),'local best must persist automatically');
assert.ok(post.includes('submitTerminalRanking'));
console.log('Chungwagame postgame ranking UI regression passed');
