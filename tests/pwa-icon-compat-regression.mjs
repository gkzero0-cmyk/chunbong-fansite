import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const png192 = manifest.icons.find(icon => icon.type === 'image/png' && icon.sizes === '192x192');
const png512 = manifest.icons.find(icon => icon.type === 'image/png' && icon.sizes === '512x512');
const svg = manifest.icons.find(icon => icon.type === 'image/svg+xml');

assert.ok(png192, 'manifest must include a 192x192 PNG icon');
assert.ok(png512, 'manifest must include a 512x512 PNG icon');
assert.ok(svg && svg.src === '/assets/app-icon.svg', 'SVG fallback icon must remain available');
assert.match(png192.src, /^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fit,h_192,w_192\/f_png\//);
assert.match(png512.src, /^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fit,h_512,w_512\/f_png\//);
assert.match(png512.purpose, /maskable/, '512 icon should remain maskable-capable');
assert.match(home, /rel="apple-touch-icon" sizes="180x180" href="https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fit,h_180,w_180\/f_png\//);

console.log('PWA PNG and Apple touch icon compatibility regression passed');
