const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const wrapperPath=path.join(__dirname,'..','api','content-runtime.js');

test('content runtime wrapper backfills verified historical SOOP metadata without mutating stored payloads',()=>{
  assert.ok(fs.existsSync(wrapperPath),'api/content-runtime.js must exist so the canonical content endpoint gets a fresh serverless bundle');
  const {applyPublicContentCorrections}=require(wrapperPath);
  const thumbnail='https://stimg.sooplive.com/NORMAL_BBS/3/24883333/72271790804311879.png';
  const upRanking={id:'survival-soop-post-204274449',type:'post',title:'적자생존 참가 신청 · UP 랭킹 원문',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/204274449',thumbnail:'',visibility:'public'};
  const authenticated={id:'soop-auth-post-208562045',type:'post',title:'그냥서버 적자생존 추가 입주 모집 공지',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562045',thumbnail:'',visibility:'public'};
  const duplicate={id:'auto-soop-post-208562077',type:'post',title:'🦁 그냥서버: 적자생존 추가입주 모집 공지',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562077',thumbnail,visibility:'public'};
  const payload={item:{id:'justserver-survival',timeline:[upRanking,authenticated,duplicate]}};
  const corrected=applyPublicContentCorrections(payload);
  const dateRow=corrected.item.timeline.find(row=>row.id===upRanking.id);
  const thumbnailRow=corrected.item.timeline.find(row=>row.id===authenticated.id);
  assert.equal(dateRow.date,'2026-08-14');
  assert.equal(dateRow.datePrecision,'day');
  assert.equal(thumbnailRow.thumbnail,thumbnail);
  assert.equal(payload.item.timeline[0].date,'','public correction must not mutate Redis/stored payload data');
  assert.equal(payload.item.timeline[1].thumbnail,'');
});

test('Vercel routes canonical /api/content through the fresh runtime wrapper',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'..','vercel.json'),'utf8'));
  const rewrite=(config.rewrites||[]).find(row=>row.source==='/api/content');
  assert.equal(rewrite?.destination,'/api/content-runtime');
});

test('content runtime exposes a correction version header for production verification',()=>{
  assert.ok(fs.existsSync(wrapperPath),'runtime wrapper must exist');
  const source=fs.readFileSync(wrapperPath,'utf8');
  assert.match(source,/CONTENT_PUBLIC_CORRECTION_VERSION/);
  assert.match(source,/X-Content-Public-Correction-Version/);
});
