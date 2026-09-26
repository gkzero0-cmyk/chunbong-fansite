import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=[
  'index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html',
  'youtube.html','tarot.html','minigames.html','chunbong-contents.html','history.html','data.html'
];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

for(const file of pages){
  const html=read(file);
  assert.match(html,/<html\b[^>]*\blang="ko"/i,file+' must declare Korean document language');
  assert.match(html,/<title>[^<]+<\/title>/i,file+' must have a title');
  assert.match(html,/<meta\s+name="description"\s+content="[^"]+"/i,file+' must have a meta description');
  assert.match(html,/<link\s+rel="canonical"\s+href="https:\/\/chunbong-fansite\.vercel\.app\//i,file+' must have a production canonical URL');
  assert.match(html,/<meta\s+property="og:title"\s+content="[^"]+"/i,file+' must have og:title');
  assert.match(html,/<meta\s+property="og:description"\s+content="[^"]+"/i,file+' must have og:description');
  assert.match(html,/<meta\s+property="og:image"\s+content="[^"]+"/i,file+' must have og:image');
  assert.equal((html.match(/<h1\b/gi)||[]).length,1,file+' must expose exactly one h1');

  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  assert.deepEqual(duplicates,[],file+' has duplicate ids: '+duplicates.join(', '));

  for(const match of html.matchAll(/<img\b[^>]*>/gi)){
    assert.match(match[0],/\balt="[^"]*"/i,file+' image is missing alt text: '+match[0].slice(0,120));
  }
  for(const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)){
    assert.match(match[0],/\brel="[^"]*(?:noopener|noreferrer)[^"]*"/i,file+' external blank-target link must use noopener/noreferrer');
  }

  for(const match of html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/gi)){
    const ref=match[1];
    if(!ref||/^(?:https?:|data:|blob:|#|\/\/)/i.test(ref)) continue;
    const clean=ref.split(/[?#]/)[0].replace(/^\.\//,'');
    if(!clean||clean.startsWith('/api/')) continue;
    assert.ok(fs.existsSync(path.join(root,clean)),file+' references missing local asset: '+ref);
  }
}
console.log('predeploy static quality gate passed');
