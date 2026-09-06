import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const upscale = read('scripts/upscale-tarot-hd.py');
const superres = read('.github/workflows/tarot-superres-assets.yml');

assert.ok(upscale.includes("SOURCE_REF = '3247a55efbc9629b5707f975e779d3893d068ff5'"), 'super-resolution must start from the preserved 640x480 source pair commit, not from an already-upscaled asset');
assert.ok(upscale.includes('RealESRGAN_x4plus_anime_6B'), 'tarot assets must use learned 4x super-resolution instead of interpolation-only scaling');
assert.ok(upscale.includes('MODEL_SIZE = (2560, 1920)'), 'learned model stage must produce a 4x 2560x1920 pair');
assert.ok(upscale.includes('TARGET_SIZE = (1920, 1440)'), 'final pair geometry must remain compatible with the existing renderer');
assert.ok(upscale.includes('git show'), 'the generator must recover the untouched 640x480 source pairs from git history');
assert.ok(upscale.includes('quality=98'), 'final AVIF encode should preserve substantially more detail than the previous compressed assets');

assert.ok(superres.includes('RealESRGAN_x4plus_anime_6B.pth'), 'asset workflow must fetch the pinned Real-ESRGAN anime model');
assert.ok(superres.includes("python-version: '3.10'"), 'asset workflow must use a compatible Python runtime');
assert.ok(superres.includes('fetch-depth: 0'), 'asset workflow needs source history to read the preserved 640x480 pair commit');
assert.ok(superres.includes('git commit'), 'asset workflow must commit regenerated binary assets back to main');
assert.ok(superres.includes('assets/tarot/hd/pair-*.avif'), 'asset workflow must verify all regenerated tarot pairs');
assert.ok(superres.includes('REMOTE_SHA256'), 'asset workflow must verify that production serves the exact regenerated binary');
assert.ok(superres.includes('chunbong-fansite.vercel.app/assets/tarot/hd/pair-00.avif'), 'asset workflow must poll the production tarot asset after pushing');

console.log('tarot learned super-resolution pipeline regression test passed');
