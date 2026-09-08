import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(page, /chunbong-theme/, 'theme choice must be persisted with a stable storage key');
assert.match(page, /data\.theme|dataset\.theme/, 'theme runtime must apply the selected theme to the document');
assert.match(page, /theme-toggle/, 'site header must expose a theme toggle control');
assert.match(styles, /data-theme=["']?light|\[data-theme=["']light["']\]/, 'shared stylesheet must define a light theme');

console.log('theme toggle regression checks passed');
