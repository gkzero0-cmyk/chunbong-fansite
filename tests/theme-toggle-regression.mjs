import assert from 'node:assert/strict';
import fs from 'node:fs';

const content = fs.readFileSync(new URL('../content.js', import.meta.url), 'utf8');

assert.doesNotThrow(() => new Function(content), 'shared site bootstrap must remain valid JavaScript');
assert.match(content, /chunbong-theme/, 'theme choice must be persisted with a stable storage key');
assert.match(content, /dataset\.theme/, 'theme runtime must apply the selected theme to the document');
assert.match(content, /theme-toggle/, 'site header must expose a theme toggle control');
assert.match(content, /theme\.css/, 'shared bootstrap must load the theme stylesheet on every page');

console.log('theme toggle regression checks passed');
