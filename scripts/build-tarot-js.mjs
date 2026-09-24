#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sources=["tarot-data.js","tarot-reading-config.js","tarot-sfx-v2-preload.js","tarot.js","tarot-sfx-v2.js","tarot-composite.js"];
export function bundleContent(){
  return sources.map(file=>`/* ===== ${file} ===== */\n${fs.readFileSync(path.join(root,file),'utf8').trim()}\n;\n`).join('\n');
}
const target=path.join(root,'tarot-bundle.js');

export function main(argv=process.argv){
  if(argv.includes('--check')){
    const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
    const expected=bundleContent();
    if(current!==expected){
      console.error('tarot-bundle.js is out of date. Run node scripts/build-tarot-js.mjs');
      return 1;
    }
    console.log('tarot-bundle.js is current');
    return 0;
  }
  fs.writeFileSync(target,bundleContent());
  console.log('wrote tarot-bundle.js');
  return 0;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  process.exitCode=main();
}
