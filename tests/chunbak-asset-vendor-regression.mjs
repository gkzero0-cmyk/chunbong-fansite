import fs from 'node:fs';
import assert from 'node:assert/strict';

const url = new URL('../assets/vendor/matter-0.20.0.min.js', import.meta.url);
assert.equal(fs.existsSync(url), true, 'Matter.js vendor file must exist');
const source = fs.readFileSync(url, 'utf8');
assert.ok(source.length > 70000, 'Matter.js must be vendored locally, not a tiny runtime loader');
assert.equal(source.includes('cdnjs.cloudflare.com'), false, 'vendored Matter.js must not depend on cdnjs');
assert.equal(source.includes('document.write'), false, 'vendored Matter.js must not inject a remote script');
assert.ok(source.includes('Matter') && source.includes('Engine'), 'vendor bundle should contain Matter.js runtime');

console.log('chunbak Matter.js vendor regression passed');
