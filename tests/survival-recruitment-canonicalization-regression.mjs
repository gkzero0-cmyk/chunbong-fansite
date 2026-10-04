import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require=createRequire(import.meta.url);
const {applyPublicContentCorrections,CONTENT_PUBLIC_CORRECTION_VERSION}=require('../lib/content-public-response-corrections.js');
const sourceCards=fs.readFileSync(new URL('../content-source-card-unifier.js',import.meta.url),'utf8');
const sourceCss=fs.readFileSync(new URL('../content-source-card-unifier.css',import.meta.url),'utf8');

const payload={item:{
  id:'justserver-survival',
  timeline:[
    {id:'survival-soop-post-204274449',title:'적자생존 참가 신청 · UP 랭킹 원문',date:'2026-08-14',url:'https://www.sooplive.com/station/chunbongtv/post/204274449'},
    {id:'soop-auth-post-208562045',title:'그냥서버 적자생존 추가 입주 모집 공지',date:'2026-09-26',url:'https://www.sooplive.com/station/chunbongtv/post/208562045'},
    {id:'auto-soop-post-208562077',title:'빠른 공지 및 피드백',date:'2026-09-26',url:'https://www.sooplive.com/station/chunbongtv/post/208562077',thumbnail:'https://example.com/2.png'},
    {id:'canonical-private-208735733',title:'3차',date:'2026-09-28',url:'https://www.sooplive.com/station/chunbongtv/post/208735733'},
    {id:'auto-soop-post-208736233',title:'🦁 그냥서버 🔥 적자생존 3차 모집 🔥',date:'2026-09-28',url:'https://www.sooplive.com/station/chunbongtv/post/208736233'},
    {id:'auto-soop-post-208904749',title:'🦁 그냥서버 적자생존 4차 추가 모집',date:'2026-09-29',url:'https://www.sooplive.com/station/chunbongtv/post/208904749',thumbnail:'https://example.com/4.png'}
  ],
  sources:[
    {id:'s1',label:'1차',url:'https://www.sooplive.com/station/chunbongtv/post/204274449'},
    {id:'s2',label:'2차',url:'https://www.sooplive.com/station/chunbongtv/post/208562045'},
    {id:'s2dup',label:'2차 중복',url:'https://www.sooplive.com/station/chunbongtv/post/208562077'},
    {id:'s3',label:'3차',url:'https://www.sooplive.com/station/chunbongtv/post/208735733'},
    {id:'s3dup',label:'3차 중복',url:'https://www.sooplive.com/station/chunbongtv/post/208736233'},
    {id:'s4dup',label:'4차 자동본',url:'https://www.sooplive.com/station/chunbongtv/post/208904749'}
  ]
}};

const corrected=applyPublicContentCorrections(structuredClone(payload));
const timeline=corrected.item.timeline;
const urls=timeline.map(row=>row.url||'');
const titles=new Map(timeline.map(row=>[String(row.url||'').match(/post\/(\d+)/)?.[1]||'',row.title]));

assert.match(CONTENT_PUBLIC_CORRECTION_VERSION,/2026-10-05-survival-recruitment-canonical/,'correction version must identify the survival canonical migration');
assert.equal(urls.filter(url=>url.includes('/204274449')).length,1,'1차 canonical source must appear exactly once');
assert.equal(titles.get('204274449'),'그냥서버 : 적자생존 입주 신청 공지','1차 title must use the requested canonical title');
assert.equal(urls.filter(url=>url.includes('/208562045')).length,1,'2차 canonical source must appear exactly once');
assert.equal(urls.some(url=>url.includes('/208562077')),false,'2차 auto duplicate must be removed');
assert.equal(urls.some(url=>url.includes('/208735733')||url.includes('/208736233')),false,'private 3차 canonical and its auto duplicate must stay hidden');
assert.equal(urls.filter(url=>url.includes('/208904595')).length,1,'4차 must be rewritten to the canonical source');
assert.equal(urls.some(url=>url.includes('/208904749')),false,'4차 auto alias must not remain public');
assert.equal(titles.get('208904595'),'그냥서버 : 적자생존 4차 입주 모집 공지','4차 title must identify its round');

const sourceUrls=(corrected.item.sources||[]).map(row=>row.url||row.link||'');
assert.equal(sourceUrls.some(url=>/208562077|208735733|208736233|208904749/.test(url)),false,'source list must not leak duplicate/private recruitment URLs');
assert.equal(sourceUrls.filter(url=>url.includes('/208904595')).length,1,'source list must expose the canonical 4차 URL');

assert.match(sourceCards,/SURVIVAL_RECRUITMENT/,'source-card runtime must recognize survival recruitment posts');
assert.match(sourceCards,/formatRecruitmentBody/,'recruitment preview must restore original-like vertical body structure');
assert.match(sourceCards,/data-recruitment-post/,'recruitment cards must opt into dedicated original-flow rendering');
assert.match(sourceCss,/\[data-recruitment-post\]/,'recruitment cards need dedicated vertical layout styling');
assert.match(sourceCss,/grid-template-columns:\s*1fr/,'recruitment header must use one vertical column rather than the generic horizontal grid');

console.log('survival recruitment canonicalization regression passed');
