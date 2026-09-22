'use strict';

const fetchVod=require('./content-api/vod');
const fetchClips=require('./content-api/clips');
const fetchYoutube=require('./content-api/youtube');
const fetchNotice=require('./content-api/notice');

const AUTO_SYNC_INTERVAL_MS=30*60*1000;
const GENERIC_TERMS=new Set([
  '춘봉','춘봉tv','콘텐츠','아카이브','마인크래프트','마크','서버','방송','다시보기','클립','catch',
  '그냥서버','대회','이벤트','클래스','주최','모집','공지','설명회','시리즈'
]);

function text(value=''){return String(value??'').trim()}
function httpsUrl(value=''){
  const raw=text(value);if(!raw)return'';
  try{
    const url=new URL(raw.startsWith('//')?'https:'+raw:raw);
    return ['http:','https:'].includes(url.protocol)?url.toString():'';
  }catch{return''}
}
function normalizeSearch(value=''){
  return text(value).toLowerCase().replace(/[^0-9a-z가-힣]+/g,'');
}
function dateOnly(value=''){
  const match=text(value).match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if(!match)return'';
  return match[1]+'-'+String(match[2]).padStart(2,'0')+'-'+String(match[3]).padStart(2,'0');
}
function shiftDate(value,days){
  const iso=dateOnly(value);if(!iso)return'';
  const d=new Date(iso+'T00:00:00Z');if(Number.isNaN(d.getTime()))return'';
  d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
function withinArchiveWindow(item={},date=''){
  const iso=dateOnly(date);if(!iso||!item.startDate)return false;
  const start=shiftDate(item.startDate,-21)||item.startDate;
  const end=shiftDate(item.endDate||item.startDate,35)||(item.endDate||item.startDate);
  return iso>=start&&iso<=end;
}
function candidateTerms(item={}){
  const values=[item.title,...(Array.isArray(item.aliases)?item.aliases:[]),item.series?.title||''];
  const terms=new Set();
  for(const value of values){
    const raw=text(value);
    if(!raw)continue;
    const chunks=[raw,...raw.split(/[:·|/\\—–-]+/g)];
    for(const chunk of chunks){
      const normalized=normalizeSearch(chunk);
      if(normalized.length<2||GENERIC_TERMS.has(normalized))continue;
      terms.add(normalized);
      if(/^제\d+회/.test(normalized))terms.add(normalized);
    }
  }
  return [...terms].sort((a,b)=>b.length-a.length);
}
function matchArchiveItem(material={},rows=[]){
  const title=normalizeSearch(material.title||'');
  const date=dateOnly(material.date||material.dateIso||'');
  const scored=[];
  for(const item of rows){
    if(!item?.id)continue;
    const inWindow=withinArchiveWindow(item,date);
    const terms=candidateTerms(item);
    const matched=terms.filter(term=>title.includes(term));
    let score=0;
    if(matched.length){
      const longest=matched[0];
      score+=longest.length>=6?8:longest.length>=4?7:5;
      if(matched.length>1)score+=1;
    }
    const genericJustserver=item.series?.id==='justserver'&&title.includes('그냥서버');
    if(genericJustserver&&inWindow)score+=5;
    if(inWindow)score+=3;
    if(!matched.length&&!genericJustserver)continue;
    scored.push({item,score,matched,inWindow});
  }
  scored.sort((a,b)=>b.score-a.score||Number(b.inWindow)-Number(a.inWindow)||String(a.item.id).localeCompare(String(b.item.id)));
  const best=scored[0],second=scored[1];
  if(!best||best.score<7)return null;
  if(second&&second.score===best.score)return null;
  return{itemId:best.item.id,score:best.score,terms:best.matched};
}
function genericTitle(value=''){
  return /(?:다시보기|vod|catch|clip|쇼츠|shorts?)\s*\d*$/i.test(text(value))||/^(?:춘봉 영상|춘봉 catch|춘봉 클립|춘봉tv 동영상|춘봉tv shorts)$/i.test(text(value));
}
function materialFromVideo(item={},type='vod'){
  const id=text(item.id);if(!id)return null;
  const url=httpsUrl(item.link)||(type==='catch'?'https://vod.sooplive.com/player/'+id+'/catch':'https://vod.sooplive.com/player/'+id);
  const date=dateOnly(item.dateIso||item.date||item.sortDate);
  const thumbnail=httpsUrl(item.thumb);
  return{
    id:'auto-soop-'+type+'-'+id,type,
    title:text(item.title)||('춘봉 '+type.toUpperCase()),
    date,datePrecision:date?'day':'unknown',url,thumbnail,sourceId:'',
    note:'춘봉 SOOP 방송국에서 자동 발견한 공식 '+(type==='vod'?'다시보기':type==='catch'?'Catch':'Clip')+' 기록입니다.',
    visibility:'public',platform:'soop'
  };
}
function materialFromYoutube(item={}){
  const id=text(item.id);if(!id)return null;
  const type=item.kind==='shorts'?'shorts':'youtube';
  const date=dateOnly(item.dateIso||item.date);
  return{
    id:'auto-youtube-'+type+'-'+id,type,
    title:text(item.title)||(type==='shorts'?'춘봉TV Shorts':'춘봉TV 동영상'),
    date,datePrecision:date?'day':'unknown',url:httpsUrl(item.link),thumbnail:httpsUrl(item.thumb),sourceId:'',
    note:'춘봉TV YouTube에서 자동 발견한 공식 '+(type==='shorts'?'Shorts':'영상')+' 기록입니다.',
    visibility:'public',platform:'youtube'
  };
}
function materialFromPost(item={}){
  const id=text(item.id);if(!id)return null;
  const date=dateOnly(item.date||item.sortDate);
  return{
    id:'auto-soop-post-'+id,type:'post',title:text(item.title)||'춘봉 SOOP 게시글',
    date,datePrecision:date?'day':'unknown',url:httpsUrl(item.link)||'https://www.sooplive.com/station/chunbongtv/post/'+id,
    thumbnail:httpsUrl(item.thumb),sourceId:'',
    note:'춘봉 SOOP 방송국 공식 게시글에서 자동 발견한 기록입니다.',visibility:'public',platform:'soop'
  };
}
function mergeMaterial(existing={},incoming={}){
  return{
    ...existing,
    title:(!existing.title||genericTitle(existing.title))&&incoming.title?incoming.title:existing.title,
    date:existing.date||incoming.date||'',
    datePrecision:existing.date?existing.datePrecision:(incoming.datePrecision||existing.datePrecision||'unknown'),
    thumbnail:existing.thumbnail||incoming.thumbnail||'',
    note:existing.note||incoming.note||'',
    url:existing.url||incoming.url||''
  };
}
function materialIdentity(row={}){
  if(row.url)return String(row.url).replace(/\/$/,'');
  return String(row.type||'')+':'+String(row.id||'');
}
function attachOfficialDiscoveries(rows=[],discoveries=[]){
  const next=rows.map(row=>JSON.parse(JSON.stringify(row)));
  const byId=new Map(next.map(row=>[row.id,row]));
  const candidates=[],changedIds=new Set(),attached=[];
  for(const material of discoveries){
    if(!material?.url||!material?.title)continue;
    let existingOwner=null,existingCollection=null,existingIndex=-1;
    for(const item of next){
      for(const key of ['timeline','media']){
        const list=Array.isArray(item[key])?item[key]:[];
        const idx=list.findIndex(row=>materialIdentity(row)===materialIdentity(material));
        if(idx>=0){existingOwner=item;existingCollection=key;existingIndex=idx;break}
      }
      if(existingOwner)break;
    }
    if(existingOwner){
      const before=JSON.stringify(existingOwner[existingCollection][existingIndex]);
      existingOwner[existingCollection][existingIndex]=mergeMaterial(existingOwner[existingCollection][existingIndex],material);
      if(JSON.stringify(existingOwner[existingCollection][existingIndex])!==before)changedIds.add(existingOwner.id);
      continue;
    }
    const match=matchArchiveItem(material,next);
    if(!match){
      candidates.push({...material,matchState:'unmatched'});
      continue;
    }
    const item=byId.get(match.itemId);if(!item)continue;
    const key=material.type==='post'?'timeline':'media';
    if(!Array.isArray(item[key]))item[key]=[];
    item[key].push(material);
    changedIds.add(item.id);
    attached.push({itemId:item.id,materialId:material.id,type:material.type,title:material.title,score:match.score});
  }
  return{rows:next,changedIds:[...changedIds],attached,candidates};
}
function dedupeMaterials(items=[]){
  const map=new Map();
  for(const item of items){
    if(!item?.url)continue;
    const key=materialIdentity(item);
    const current=map.get(key);
    if(!current||(!current.thumbnail&&item.thumbnail)||(!current.date&&item.date))map.set(key,item);
  }
  return[...map.values()];
}
async function discoverOfficialArchiveMaterials(){
  const [vods,clips,youtube,posts]=await Promise.all([
    fetchVod().catch(()=>[]),
    fetchClips().catch(()=>({catch:[],clip:[],items:[]})),
    fetchYoutube().catch(()=>({videos:[],shorts:[],items:[]})),
    fetchNotice().catch(()=>[])
  ]);
  const materials=[
    ...(vods||[]).map(item=>materialFromVideo(item,'vod')),
    ...(clips?.catch||[]).map(item=>materialFromVideo(item,'catch')),
    ...(clips?.clip||[]).map(item=>materialFromVideo(item,'clip')),
    ...(youtube?.videos||[]).map(materialFromYoutube),
    ...(youtube?.shorts||[]).map(materialFromYoutube),
    ...(posts||[]).map(materialFromPost)
  ].filter(Boolean);
  return{
    materials:dedupeMaterials(materials),
    counts:{
      posts:(posts||[]).length,
      vods:(vods||[]).length,
      catches:(clips?.catch||[]).length,
      clips:(clips?.clip||[]).length,
      youtube:(youtube?.videos||[]).length,
      shorts:(youtube?.shorts||[]).length
    }
  };
}
function mergeCandidates(previous=[],incoming=[]){
  const byUrl=new Map();
  for(const row of [...previous,...incoming]){
    if(!row?.url)continue;
    const current=byUrl.get(row.url)||{};
    byUrl.set(row.url,{...current,...row,firstSeenAt:current.firstSeenAt||row.firstSeenAt||new Date().toISOString(),lastSeenAt:new Date().toISOString()});
  }
  return[...byUrl.values()].sort((a,b)=>String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))).slice(0,250);
}

module.exports={
  AUTO_SYNC_INTERVAL_MS,normalizeSearch,candidateTerms,withinArchiveWindow,matchArchiveItem,
  attachOfficialDiscoveries,discoverOfficialArchiveMaterials,mergeCandidates,materialFromVideo,materialFromYoutube,materialFromPost
};
