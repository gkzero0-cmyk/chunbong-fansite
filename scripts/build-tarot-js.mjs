#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sources=["tarot-data.js","tarot-reading-config.js","tarot-sfx-v2-preload.js","tarot.js","tarot-sfx-v2.js","tarot-composite.js"];
export function bundleContent(){
  return sources.map(file=>`/* ===== ${file} ===== */\n${fs.readFileSync(path.join(root,file),'utf8').trim()}\n;\n`).join('\n');
}
const target=path.join(root,'tarot-bundle.js');
if(process.argv.includes('--check')){
  const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
  const expected=bundleContent();
  if(current!==expected){
    console.error('tarot-bundle.js is out of date. Run node scripts/build-tarot-js.mjs');
    process.exit(1);
  }
  console.log('tarot-bundle.js is current');
}else{
  fs.writeFileSync(target,bundleContent());
  console.log('wrote tarot-bundle.js');
}
