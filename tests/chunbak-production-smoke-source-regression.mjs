import fs from 'node:fs';
import assert from 'node:assert/strict';
const yml=fs.readFileSync(new URL('../.github/workflows/chunbak-production-smoke.yml',import.meta.url),'utf8');
for(const token of ['chunbak.html','minigames.html','assets/chunbak/11.png','type=chunbak-ranking','1440','390','playwright']) assert.ok(yml.includes(token), `missing ${token}`);
console.log('chunbak production smoke source regression passed');
