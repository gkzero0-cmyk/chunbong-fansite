import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const tarot = fs.readFileSync(new URL('tarot.html', root), 'utf8');
const styles = fs.readFileSync(new URL('tarot-hero-banner.css', root), 'utf8');
const bannerUrl = new URL('assets/tarot-consult-banner.jpg', root);

function jpegSize(bytes) {
  assert.equal(bytes[0], 0xff, 'JPEG must start with FF');
  assert.equal(bytes[1], 0xd8, 'JPEG must start with D8');
  let offset = 2;
  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG SOF marker not found');
}

assert.match(tarot, /href="tarot-hero-banner\.css"/, 'tarot page should load the dedicated hero banner stylesheet');
assert.match(tarot, /class="page-hero tarot-hero"[\s\S]*class="tarot-hero-grid"/, 'tarot hero should use a two-column wrapper');
assert.doesNotMatch(tarot, /src="assets\/tarot-consult-banner\.webp"/, 'tarot hero must not use the invalid WebP asset');
assert.match(tarot, /<img[^>]+class="tarot-hero-banner"[^>]+src="assets\/tarot-consult-banner\.jpg"/, 'tarot hero should use the validated JPEG banner');
assert.match(styles, /\.tarot-hero-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:/s, 'tarot hero should lay out copy and banner side by side on desktop');
assert.match(styles, /@media\(max-width:\s*700px\)[\s\S]*\.tarot-hero-grid\s*\{[^}]*grid-template-columns:\s*1fr/s, 'tarot hero banner should stack under the copy on mobile');

const banner = fs.readFileSync(bannerUrl);
assert.ok(banner.length > 50_000, `tarot hero JPEG should contain real image data, got ${banner.length} bytes`);
assert.equal(banner.at(-2), 0xff, 'JPEG must end with FF');
assert.equal(banner.at(-1), 0xd9, 'JPEG must end with D9');
assert.deepEqual(jpegSize(banner), { width: 960, height: 540 }, 'tarot hero JPEG should be the expected 16:9 source');

console.log('tarot hero banner regression checks passed');
