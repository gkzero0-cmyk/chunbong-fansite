import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const bundles=[
  {out:'tarot-bundle.css',kind:'css',files:['tarot.css','tarot-quality.css','tarot-composite.css','tarot-hero-banner.css','tarot-reading-v3.css','tarot-luxury-foil.css']},
  {out:'tarot-bundle.js',kind:'js',files:['tarot-data.js','tarot-reading-config.js','tarot-sfx-v2-preload.js','tarot.js','tarot-sfx-v2.js','tarot-composite.js']}
];

export function bundleContent(entry){
  return entry.files.map(file=>`/* ${file} */\n${fs.readFileSync(file,'utf8').trim()}\n${entry.kind==='js'?';':''}\n`).join('\n');
}

export function build(){
  for(const entry of bundles)fs.writeFileSync(entry.out,bundleContent(entry));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)build();
export {bundles};
