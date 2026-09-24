#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=["tarot.css","tarot-quality.css","tarot-composite.css","tarot-hero-banner.css","tarot-reading-v3.css","tarot-luxury-foil.css"];
const parts=sources.map(file=>`/* ===== ${file} ===== */\n${fs.readFileSync(path.join(root,file),'utf8').trim()}\n`);
const output=`/* GENERATED FILE. Source order: ${sources.join(', ')} */\n/* Run node scripts/build-tarot-css.mjs after editing a tarot source stylesheet. */\n\n${parts.join('\n')}`;
const target=path.join(root,'tarot-bundle.css');
const check=process.argv.includes('--check');
if(check){
  const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
  if(current!==output){
    console.error('tarot-bundle.css is out of date. Run node scripts/build-tarot-css.mjs');
    process.exit(1);
  }
  console.log('tarot-bundle.css is current');
}else{
  fs.writeFileSync(target,output);
  console.log('wrote tarot-bundle.css');
}
