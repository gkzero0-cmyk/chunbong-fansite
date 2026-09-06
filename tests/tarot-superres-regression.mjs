import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const upscale = read('scripts/upscale-tarot-hd.py');
const tarot = read('tarot.js');
const smoke = read('.github/workflows/tarot-production-smoke.yml');
const superres = read('.github/workflows/tarot-superres-assets.yml');

assert.ok(upscale.includes("SOURCE_REF = '3247a55efbc9629b5707f975e779d3893d068ff5'"), 'super-resolution must start from the preserved 640x480 source pair commit, not from an already-upscaled asset');
assert.ok(upscale.includes('RealESRGAN_x4plus_anime_6B'), 'tarot assets must use learned 4x super-resolution instead of Lanczos-only scaling');
assert.ok(upscale.includes('TARGET_SIZE = (2560, 1920)'), '39 pair assets must be regenerated at 2560x1920');
assert.ok(upscale.includes('git show'), 'the generator must recover the untouched 640x480 source pairs from git history');
assert.ok(!upscale.includes('Image.Resampling.LANCZOS'), 'the primary quality path must not be the old interpolation-only upscale');

assert.ok(tarot.includes('viewBox="0 0 1280 1920"'), 'renderer must crop one native 1280x1920 super-res card');
assert.ok(tarot.includes('width="2560" height="1920"'), 'renderer must preserve the 2560x1920 pair pixel geometry');
assert.ok(tarot.includes('sourceX: pairSlot === 0 ? 0 : -1280'), 'renderer must crop the second 1280px-wide card exactly');

assert.ok(superres.includes('RealESRGAN_x4plus_anime_6B.pth'), 'asset workflow must fetch the pinned Real-ESRGAN anime model');
assert.ok(superres.includes("python-version: '3.10'"), 'asset workflow must use the compatible Python runtime');
assert.ok(superres.includes('git commit'), 'asset workflow must commit the regenerated binary assets back to main');
assert.ok(superres.includes('assets/tarot/hd/pair-*.avif'), 'asset workflow must verify all regenerated tarot pairs');

assert.ok(smoke.includes("workflows: ['Tarot super-resolution assets']"), 'production smoke must run after the asset-generation workflow completes');
assert.ok(smoke.includes("github.event.workflow_run.conclusion == 'success'"), 'chained production smoke must only run after successful asset generation');

console.log('tarot learned super-resolution pipeline regression test passed');
