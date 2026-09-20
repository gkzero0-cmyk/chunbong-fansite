import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
const improvements=fs.readFileSync(new URL('../site-improvements.js',import.meta.url),'utf8');
const quality=fs.readFileSync(new URL('../site-quality.css',import.meta.url),'utf8');

assert.match(improvements,/setAttribute\('aria-current','page'\)/,'current nav link must expose aria-current');
assert.match(shell+improvements,/is-current-section/,'current nav group must expose a separate section state');
assert.match(quality,/\.nav-group\.is-current-section>/,'current section must have distinct styling');
assert.match(quality,/\[aria-current="page"\]/,'current page must have a dedicated style');
assert.match(quality,/--text-secondary/,'default header text should use the shared readable text token');
assert.match(quality,/--text-primary/,'hover/open header text should use the shared primary text token');

console.log('header visual state regression passed');
