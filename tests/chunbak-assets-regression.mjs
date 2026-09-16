import fs from 'node:fs';
import assert from 'node:assert/strict';
for(let level=1;level<=11;level+=1){
  const url=new URL(`../assets/chunbak/${level}.png`,import.meta.url);
  assert.equal(fs.existsSync(url),true,`missing assets/chunbak/${level}.png`);
  const bytes=fs.readFileSync(url);
  assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
  assert.ok(bytes.length>10000);
}
console.log('chunbak assets regression passed');
