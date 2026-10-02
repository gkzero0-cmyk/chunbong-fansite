'use strict';

const KNOWN_SOOP_TITLE_FIXES={
  '203683207':'그냥서버:적자생존 공지',
  '204093563':'그냥서버:적자생존 인게임',
  '204274449':'적자생존 참가 신청 · UP 랭킹 원문',
  '206972857':'🦁 그냥서버:적자생존 일정 변경 공지',
  '208454475':'🦁 그냥서버:적자생존 오늘부터 시작됩니다.',
  '208464961':'🦁 그냥서버:적자생존 관련 중요 공지',
  '208495651':'그냥서버:적자생존 오픈 전 설명회 하겠습니다.',
  '208562045':'그냥서버 적자생존 추가 입주 모집 공지'
};

function clean(value=''){
  return String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
function isHttpsUrl(value=''){
  try{return new URL(String(value||'')).protocol==='https:'}catch{return false}
}
function isGenericSoopImage(value=''){
  if(!isHttpsUrl(value))return true;
  const url=new URL(String(value));
  const path=(url.pathname||'').toLowerCase();
  if(url.hostname==='res.sooplive.com'&&path.startsWith('/images/svg/'))return true;
  if(/(?:^|[\/_-])(thumb_)?profile(?:[\/_\-.]|$)/i.test(path))return true;
  if(/(?:default|no[-_]?image|blank)[-_]?(?:profile|thumb|image)?/i.test(path))return true;
  if(/(?:image)?loading(?:light|dark)?\.(?:gif|png|webp)$/i.test(path))return true;
  return false;
}
function sanitizeSoopImages(values=[]){
  const rows=[];
  for(const value of Array.isArray(values)?values:[]){
    const raw=String(value||'').trim();
    if(!raw||isGenericSoopImage(raw)||rows.includes(raw))continue;
    rows.push(raw);
    if(rows.length>=24)break;
  }
  return rows;
}
function isGenericSoopTitle(value='',postId=''){
  const title=clean(value),id=String(postId||'').trim();
  if(!title)return true;
  if(/^춘봉_?의\s*방송국$/i.test(title))return true;
  if(/^SOOP\s*(?:로그인\s*제한|로그인|애청자|구독자|공개)\s*(?:게시글|글)\s*[·:|-]?\s*\d*$/i.test(title))return true;
  if(id&&new RegExp('^(?:SOOP\\s*)?(?:게시글|글)?\\s*[·:|-]?\\s*'+id+'$','i').test(title))return true;
  if(/^SOOP(?:LIVE)?$/i.test(title))return true;
  return false;
}
function looksLikeUiLine(value='',postId=''){
  const line=clean(value);
  if(!line||line.length<3||line.length>180)return true;
  if(isGenericSoopTitle(line,postId))return true;
  if(/^(?:로그인|회원가입|방송국|홈|게시판|VOD|Catch|클립|즐겨찾기|애청자|구독|공유|신고|목록|이전글|다음글|댓글|공지사항)$/i.test(line))return true;
  if(/^(?:작성자|작성일|조회|추천|댓글)\s*[:：]?/i.test(line))return true;
  if(/^20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}(?:\s+\d{1,2}:\d{2})?$/.test(line))return true;
  if(/^https?:\/\//i.test(line))return true;
  return false;
}
function inferSoopTitleFromBody(body='',postId=''){
  const lines=String(body||'').split(/\r?\n/).map(clean).filter(Boolean);
  for(const line of lines.slice(0,40)){
    if(!looksLikeUiLine(line,postId))return line.slice(0,180);
  }
  return '';
}
function normalizeDate(value=''){
  const match=String(value||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if(!match)return '';
  const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return '';
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function mergeSoopBrowserMetadata(payload={},sourceMeta={}){
  const postId=String(payload.postId||((String(payload.url||'').match(/\/post\/(\d+)/)||[])[1]||''));
  const sourceTitle=clean(sourceMeta.title||'');
  const browserTitle=clean(payload.title||'');
  const inferred=inferSoopTitleFromBody(payload.body||'',postId);
  const known=KNOWN_SOOP_TITLE_FIXES[postId]||'';
  const title=known||(!isGenericSoopTitle(sourceTitle,postId)?sourceTitle:
    !isGenericSoopTitle(browserTitle,postId)?browserTitle:
    inferred||browserTitle||sourceTitle);
  const date=normalizeDate(sourceMeta.publishedDate||sourceMeta.date||payload.date||payload.publishedDate||'')||String(payload.date||'');
  const images=sanitizeSoopImages([
    sourceMeta.image,
    ...(Array.isArray(sourceMeta.images)?sourceMeta.images:[]),
    ...(Array.isArray(payload.images)?payload.images:[])
  ]);
  return{...payload,title,date,images};
}
function postIdFromUrl(value=''){
  return (String(value||'').match(/\/post\/(\d+)/)||[])[1]||'';
}
function sourceLabelTitle(value='',postId=''){
  const label=clean(value).replace(/^(?:SOOP|숲)\s*(?:로그인\s*제한|애청자|공개)?\s*(?:게시글|글)?\s*[·:|-]\s*/i,'');
  return !isGenericSoopTitle(label,postId)&&label!==postId?label:'';
}
function publicSoopSourceLabel(value='',postId='',fallbackTitle=''){
  const known=KNOWN_SOOP_TITLE_FIXES[postId]||'';
  const sourceTitle=sourceLabelTitle(value,postId);
  const rowTitle=!isGenericSoopTitle(fallbackTitle,postId)?clean(fallbackTitle):'';
  const title=known||rowTitle||sourceTitle||postId;
  return title?`SOOP 게시글 · ${title}`:'SOOP 게시글';
}
function isOperatorAuthStatusNote(value=''){
  const note=clean(value);
  return /SOOP\s*로그인\s*제한\s*자료.*운영자.*공개\s*참고자료/i.test(note);
}
function repairPublicArchiveItem(rawItem={}){
  if(!rawItem||typeof rawItem!=='object')return rawItem;
  const sources=(Array.isArray(rawItem.sources)?rawItem.sources:[]).map(raw=>{
    const row={...raw},postId=postIdFromUrl(raw?.url||'');
    if(postId)row.label=publicSoopSourceLabel(row.label,postId);
    return row;
  });
  const sourceById=new Map(sources.map(row=>[String(row.id||''),row]));
  const timeline=(Array.isArray(rawItem.timeline)?rawItem.timeline:[]).map(raw=>{
    const row={...raw},postId=postIdFromUrl(row.url||''),source=sourceById.get(String(row.sourceId||''));
    if(!postId)return row;
    const known=KNOWN_SOOP_TITLE_FIXES[postId]||'';
    const sourceTitle=sourceLabelTitle(source?.label||'',postId);
    if(known||isGenericSoopTitle(row.title,postId))row.title=known||sourceTitle||row.title;
    if(row.thumbnail&&isGenericSoopImage(row.thumbnail))row.thumbnail='';
    if(isOperatorAuthStatusNote(row.note))row.note='';
    if(source)source.label=publicSoopSourceLabel(source.label,postId,row.title);
    return row;
  });
  return{...rawItem,timeline,sources};
}
module.exports={KNOWN_SOOP_TITLE_FIXES,isGenericSoopImage,isGenericSoopTitle,sanitizeSoopImages,inferSoopTitleFromBody,mergeSoopBrowserMetadata,normalizeDate,repairPublicArchiveItem};