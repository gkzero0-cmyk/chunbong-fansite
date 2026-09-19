import fs from 'node:fs';
import assert from 'node:assert/strict';

let totalBytes=0;
for(let level=1;level<=11;level+=1){
  const webp=new URL(`../assets/chunbak/${level}.webp`,import.meta.url);
  const png=new URL(`../assets/chunbak/${level}.png`,import.meta.url);
  assert.equal(fs.existsSync(webp),true,`missing assets/chunbak/${level}.webp`);
  assert.equal(fs.existsSync(png),false,`legacy PNG should be removed for stage ${level}`);
  const bytes=fs.readFileSync(webp);
  totalBytes+=bytes.length;
  assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
  assert.ok(bytes.length>10000);
}
assert.ok(totalBytes < 6 * 1024 * 1024, `lossless WebP bundle should stay below 6 MiB, got ${totalBytes}`);
assert.ok(totalBytes > 4 * 1024 * 1024, 'asset budget should remain consistent with high-detail lossless character art');
console.log(`chunbak lossless WebP assets regression passed; total=${totalBytes}`);
