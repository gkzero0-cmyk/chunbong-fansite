import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const exists=url=>fs.existsSync(path.join(root,String(url).split(/[?#]/)[0].replace(/^\//,'')));

const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.id,'/','PWA id must remain stable');
assert.equal(manifest.scope,'/','PWA scope must cover the site');
assert.ok(String(manifest.start_url||'').startsWith('/'),'PWA start_url must be same-origin');
assert.ok(['standalone','minimal-ui'].includes(manifest.display),'PWA must remain install-oriented');
assert.equal(manifest.lang,'ko-KR','PWA language must remain Korean');

for(const icon of manifest.icons||[]){
  assert.ok(exists(icon.src),'manifest icon is missing: '+icon.src);
  assert.ok(icon.sizes,'manifest icon sizes missing: '+icon.src);
  assert.ok(icon.type,'manifest icon type missing: '+icon.src);
}
assert.ok((manifest.icons||[]).some(icon=>icon.sizes==='192x192'),'192px install icon missing');
assert.ok((manifest.icons||[]).some(icon=>icon.sizes==='512x512'),'512px install icon missing');
assert.ok((manifest.icons||[]).some(icon=>String(icon.purpose||'').includes('maskable')),'maskable install icon missing');

for(const shortcut of manifest.shortcuts||[]){
  assert.ok(shortcut.name&&shortcut.url,'PWA shortcut requires name and URL');
  assert.ok(exists(shortcut.url),'PWA shortcut target is missing: '+shortcut.url);
  for(const icon of shortcut.icons||[]) assert.ok(exists(icon.src),'PWA shortcut icon is missing: '+icon.src);
}

const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const shellBlock=sw.match(/const APP_SHELL = \[([\s\S]*?)\]\s*const APP_SHELL_PATHS/);
assert.ok(shellBlock,'service worker APP_SHELL list missing');
const shell=[...shellBlock[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
assert.ok(shell.includes('/offline.html'),'offline fallback must be precached');
assert.ok(shell.includes('/manifest.webmanifest'),'manifest must be precached');
for(const asset of shell){
  if(asset==='/') continue;
  assert.ok(exists(asset),'service worker app-shell asset is missing: '+asset);
}
assert.equal(new Set(shell).size,shell.length,'service worker APP_SHELL must not contain duplicate entries');
console.log('predeploy PWA integrity gate passed');
