import fs from 'node:fs';
import assert from 'node:assert/strict';

const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris'];
const link = 'data-nav="chuntris" href="chuntris.html">춘트리스</a>';

for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(link), `${page}.html must link to Chuntris in main navigation`);
}

const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="chuntris"'), 'Chuntris page must expose data-page for active navigation state');

console.log('chuntris navigation regression passed');
