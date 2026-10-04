'use strict';

const CONTENT_PUBLIC_CORRECTION_VERSION='2026-10-04-media-post-v3';
const VERIFIED_UP_RANKING_DATE='2026-08-14';
const VERIFIED_UP_RANKING_THUMBNAIL='https://stimg.sooplive.com/NORMAL_BBS/3/24883333/23031786686873061.png';
const RECRUITMENT_SOURCE_ID='soop-auth-post-208562045';
const RECRUITMENT_DUPLICATE_ID='auto-soop-post-208562077';
const UP_RANKING_ID='survival-soop-post-204274449';
const PRIVATE_SOOP_POST_IDS=new Set(['208735733']);

function privateSoopPostId(record){
  if(!record||typeof record!=='object')return'';
  const values=[record.id,record.postId,record.sourcePostId,record.url,record.link,record.href,record.sourceUrl,record.source?.id,record.source?.url,record.source?.link];
  for(const value of values){
    const text=String(value||'');
    for(const id of PRIVATE_SOOP_POST_IDS)if(text.includes(id))return id;
  }
  return'';
}

function applyPublicContentCorrections(payload){
  if(!payload||typeof payload!=='object'||payload?.item?.id!=='justserver-survival')return payload;
  const item=payload.item;
  const timeline=Array.isArray(item.timeline)?item.timeline:[];
  let changed=false;
  const publicTimeline=timeline.filter(row=>!privateSoopPostId(row));
  if(publicTimeline.length!==timeline.length)changed=true;
  const recruitmentThumbnail=publicTimeline.find(row=>String(row?.id||'')===RECRUITMENT_DUPLICATE_ID)?.thumbnail||'';
  const correctedTimeline=publicTimeline.map(row=>{
    const id=String(row?.id||'');
    if(id===UP_RANKING_ID){
      const date=row.date||VERIFIED_UP_RANKING_DATE;
      const datePrecision=row.date?row.datePrecision:'day';
      const thumbnail=row.thumbnail||VERIFIED_UP_RANKING_THUMBNAIL;
      if(date!==row.date||datePrecision!==row.datePrecision||thumbnail!==row.thumbnail)changed=true;
      return {...row,date,datePrecision,thumbnail};
    }
    if(id===RECRUITMENT_SOURCE_ID&&!row.thumbnail&&recruitmentThumbnail){
      changed=true;
      return {...row,thumbnail:recruitmentThumbnail};
    }
    return row;
  });
  let correctedSources=item.sources;
  if(Array.isArray(item.sources)){
    correctedSources=item.sources.filter(row=>!privateSoopPostId(row));
    if(correctedSources.length!==item.sources.length)changed=true;
  }
  if(!changed)return payload;
  return {...payload,item:{...item,timeline:correctedTimeline,...(Array.isArray(item.sources)?{sources:correctedSources}:{})}};
}

module.exports={applyPublicContentCorrections,CONTENT_PUBLIC_CORRECTION_VERSION};
