'use strict';

const CONTENT_PUBLIC_CORRECTION_VERSION='2026-10-04-soop-history-v1';
const VERIFIED_UP_RANKING_DATE='2026-08-14';
const RECRUITMENT_SOURCE_ID='soop-auth-post-208562045';
const RECRUITMENT_DUPLICATE_ID='auto-soop-post-208562077';
const UP_RANKING_ID='survival-soop-post-204274449';

function applyPublicContentCorrections(payload){
  if(!payload||typeof payload!=='object'||payload?.item?.id!=='justserver-survival')return payload;
  const item=payload.item;
  const timeline=Array.isArray(item.timeline)?item.timeline:[];
  const recruitmentThumbnail=timeline.find(row=>String(row?.id||'')===RECRUITMENT_DUPLICATE_ID)?.thumbnail||'';
  let changed=false;
  const correctedTimeline=timeline.map(row=>{
    const id=String(row?.id||'');
    if(id===UP_RANKING_ID&&!row.date){
      changed=true;
      return {...row,date:VERIFIED_UP_RANKING_DATE,datePrecision:'day'};
    }
    if(id===RECRUITMENT_SOURCE_ID&&!row.thumbnail&&recruitmentThumbnail){
      changed=true;
      return {...row,thumbnail:recruitmentThumbnail};
    }
    return row;
  });
  if(!changed)return payload;
  return {...payload,item:{...item,timeline:correctedTimeline}};
}

module.exports={applyPublicContentCorrections,CONTENT_PUBLIC_CORRECTION_VERSION};
