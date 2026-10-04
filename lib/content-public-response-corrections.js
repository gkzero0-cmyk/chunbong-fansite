'use strict';

const CONTENT_PUBLIC_CORRECTION_VERSION='2026-10-05-survival-recruitment-canonical-v1';
const VERIFIED_UP_RANKING_DATE='2026-08-14';
const VERIFIED_UP_RANKING_THUMBNAIL='https://stimg.sooplive.com/NORMAL_BBS/3/24883333/23031786686873061.png';
const UP_RANKING_ID='survival-soop-post-204274449';
const BROKEN_DUPLICATE_BRIEFING_VOD_ID='survival-presentation-vod-207560243';
const PREFERRED_BRIEFING_VOD_ID='auto-soop-vod-207561839';

const SURVIVAL_RECRUITMENT_POSTS=[
  {round:1,canonicalId:'204274449',aliases:[],title:'그냥서버 : 적자생존 입주 신청 공지',label:'1차 입주 신청 원문'},
  {round:2,canonicalId:'208562045',aliases:['208562077'],title:'그냥서버 : 적자생존 2차 입주 모집 공지',label:'2차 입주 모집 원문'},
  {round:3,canonicalId:'208735733',aliases:['208736233'],title:'그냥서버 : 적자생존 3차 입주 모집 공지',label:'3차 입주 모집 원문',private:true},
  {round:4,canonicalId:'208904595',aliases:['208904749'],title:'그냥서버 : 적자생존 4차 입주 모집 공지',label:'4차 입주 모집 원문'}
];
const RECRUITMENT_BY_ANY_ID=new Map();
for(const spec of SURVIVAL_RECRUITMENT_POSTS){
  RECRUITMENT_BY_ANY_ID.set(spec.canonicalId,spec);
  for(const alias of spec.aliases)RECRUITMENT_BY_ANY_ID.set(alias,spec);
}

function recordValues(record){
  if(!record||typeof record!=='object')return[];
  return [record.id,record.postId,record.sourcePostId,record.url,record.link,record.href,record.sourceUrl,record.previewUrl,record.source?.id,record.source?.url,record.source?.link];
}
function soopPostId(record){
  for(const value of recordValues(record)){
    const text=String(value||'');
    const match=text.match(/(?:post\D*|post\/)(\d{6,})/i)||text.match(/(?:^|\D)(20\d{7})(?:\D|$)/);
    if(match?.[1])return match[1];
    for(const known of RECRUITMENT_BY_ANY_ID.keys())if(text.includes(known))return known;
  }
  return'';
}
function recruitmentSpec(record){return RECRUITMENT_BY_ANY_ID.get(soopPostId(record))||null}
function canonicalUrl(postId){return `https://www.sooplive.com/station/chunbongtv/post/${postId}`}
function replaceKnownId(value,fromId,toId){
  const text=String(value||'');
  return fromId&&toId&&text.includes(fromId)?text.replaceAll(fromId,toId):value;
}
function normalizeRecruitmentRecord(record,spec,postId,thumbnail=''){
  let next={...record};
  const canonicalId=spec.canonicalId,url=canonicalUrl(canonicalId);
  if(next.id)next.id=replaceKnownId(next.id,postId,canonicalId);
  if(next.sourceId)next.sourceId=replaceKnownId(next.sourceId,postId,canonicalId);
  if('postId'in next)next.postId=canonicalId;
  if('sourcePostId'in next)next.sourcePostId=canonicalId;
  next.url=url;
  if('link'in next)next.link=url;
  if('href'in next)next.href=url;
  if('sourceUrl'in next)next.sourceUrl=url;
  if(next.source&&typeof next.source==='object'){
    next.source={...next.source};
    if(next.source.id)next.source.id=replaceKnownId(next.source.id,postId,canonicalId);
    if(next.source.url)next.source.url=url;
    if(next.source.link)next.source.link=url;
  }
  if('title'in next||String(next.id||'').includes('post'))next.title=spec.title;
  if('label'in next)next.label=spec.label;
  next.recruitmentRound=spec.round;
  if(thumbnail&&!next.thumbnail)next.thumbnail=thumbnail;
  if(canonicalId==='204274449'){
    if(!next.date)next.date=VERIFIED_UP_RANKING_DATE;
    if(!next.datePrecision)next.datePrecision='day';
    if(!next.thumbnail)next.thumbnail=VERIFIED_UP_RANKING_THUMBNAIL;
  }
  return next;
}
function canonicalizeRecruitmentCollection(rows=[]){
  if(!Array.isArray(rows))return{rows,changed:false};
  const canonicalPresent=new Set();
  const fallbackThumb=new Map();
  for(const row of rows){
    const postId=soopPostId(row),spec=RECRUITMENT_BY_ANY_ID.get(postId);
    if(!spec)continue;
    if(postId===spec.canonicalId)canonicalPresent.add(spec.canonicalId);
    if(row?.thumbnail&&!fallbackThumb.has(spec.canonicalId))fallbackThumb.set(spec.canonicalId,row.thumbnail);
  }
  const seen=new Set(),out=[];
  let changed=false;
  for(const row of rows){
    const postId=soopPostId(row),spec=RECRUITMENT_BY_ANY_ID.get(postId);
    if(!spec){out.push(row);continue}
    if(spec.private){changed=true;continue}
    if(postId!==spec.canonicalId&&canonicalPresent.has(spec.canonicalId)){changed=true;continue}
    if(seen.has(spec.canonicalId)){changed=true;continue}
    seen.add(spec.canonicalId);
    const next=normalizeRecruitmentRecord(row,spec,postId,fallbackThumb.get(spec.canonicalId)||'');
    if(JSON.stringify(next)!==JSON.stringify(row))changed=true;
    out.push(next);
  }
  return{rows:out,changed};
}
function privateSoopPostId(record){
  const spec=recruitmentSpec(record);
  return spec?.private?spec.canonicalId:'';
}

function applyPublicContentCorrections(payload){
  if(!payload||typeof payload!=='object'||payload?.item?.id!=='justserver-survival')return payload;
  const item=payload.item;
  let changed=false;
  const timelineResult=canonicalizeRecruitmentCollection(Array.isArray(item.timeline)?item.timeline:[]);
  changed=changed||timelineResult.changed;
  const correctedTimeline=timelineResult.rows;

  let correctedSources=item.sources;
  if(Array.isArray(item.sources)){
    const result=canonicalizeRecruitmentCollection(item.sources);
    correctedSources=result.rows;
    changed=changed||result.changed;
  }
  let correctedSourcePreviews=item.sourcePreviews;
  if(Array.isArray(item.sourcePreviews)){
    const result=canonicalizeRecruitmentCollection(item.sourcePreviews);
    correctedSourcePreviews=result.rows;
    changed=changed||result.changed;
  }
  let correctedMedia=item.media;
  if(Array.isArray(item.media)){
    const hasPreferred=item.media.some(row=>String(row?.id||'')===PREFERRED_BRIEFING_VOD_ID);
    correctedMedia=hasPreferred?item.media.filter(row=>String(row?.id||'')!==BROKEN_DUPLICATE_BRIEFING_VOD_ID):item.media;
    if(correctedMedia.length!==item.media.length)changed=true;
  }
  if(!changed)return payload;
  return {...payload,item:{
    ...item,
    timeline:correctedTimeline,
    ...(Array.isArray(item.sources)?{sources:correctedSources}:{}),
    ...(Array.isArray(item.sourcePreviews)?{sourcePreviews:correctedSourcePreviews}:{}),
    ...(Array.isArray(item.media)?{media:correctedMedia}:{})
  }};
}

module.exports={applyPublicContentCorrections,CONTENT_PUBLIC_CORRECTION_VERSION,SURVIVAL_RECRUITMENT_POSTS,_internals:{soopPostId,recruitmentSpec,canonicalizeRecruitmentCollection,privateSoopPostId}};
