import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const helper=fs.readFileSync(new URL('../operator-collector-install-helper.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('collector update uses a native userscript link instead of scripted navigation',()=>{
  assert.match(helper,/<a[^>]+data-collector-install-action[^>]*>/s);
  assert.doesNotMatch(helper,/location\.assign\(installUrl\(\)\)/);
  assert.match(helper,/action\??\.setAttribute\(['"]href['"],installUrl\(\)\)/);
});

test('collector userscript is explicitly served without stale caching',()=>{
  const rule=vercel.headers.find(entry=>entry.source==='/chunbong-content-collector.user.js');
  assert.ok(rule,'collector userscript must have its own cache rule');
  const cache=rule.headers?.find(header=>header.key.toLowerCase()==='cache-control')?.value||'';
  assert.match(cache,/no-cache/i);
  assert.match(cache,/no-store/i);
  assert.match(cache,/must-revalidate/i);
});
