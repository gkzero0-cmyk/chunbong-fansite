import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

assert.match(html, /id="chunbak-start"[^>]*disabled/, 'start must be disabled until all stage images preload');
assert.match(html, /id="chunbak-restart"[^>]*disabled/, 'restart must also be disabled until all stage images preload');
assert.ok(js.includes('restartButton.disabled = false'), 'restart must be enabled only after preload succeeds');
assert.ok(js.includes('restartButton.disabled = true'), 'restart must remain disabled when preload fails');

console.log('chunbak asset gate regression passed');
