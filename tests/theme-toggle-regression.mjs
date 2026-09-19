import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync(new URL('../site-shell.js', import.meta.url), 'utf8');

assert.doesNotThrow(() => new Function(shell), 'shared site bootstrap must remain valid JavaScript');
assert.match(shell, /chunbong-theme/, 'theme choice must be persisted with a stable storage key');
assert.match(shell, /dataset\.theme/, 'theme runtime must apply the selected theme to the document');
assert.match(shell, /theme-toggle/, 'site header must expose a theme toggle control');
assert.match(shell, /theme\.css/, 'shared bootstrap must load the theme stylesheet on every page');

console.log('theme toggle regression checks passed');
