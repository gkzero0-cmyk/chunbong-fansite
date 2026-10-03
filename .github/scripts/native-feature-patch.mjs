import fs from 'node:fs';

const trigger=JSON.parse(fs.readFileSync('.github/native-feature-patch-trigger.json','utf8'));

function replaceOnce(source,needle,replacement,label){
  if(!source.includes(needle))throw new Error(`missing_${label}`);
  if(source.indexOf(needle)!==source.lastIndexOf(needle))throw new Error(`ambiguous_${label}`);
  return source.replace(needle,replacement);
}

function task1(){
  const path='chunbong-contents.js';
  let source=fs.readFileSync(path,'utf8');
  if(source.includes('function postCanonicalKey('))throw new Error('task1_already_applied');
  const anchor="function materialTypeLabel(t){return TYPE_LABELS[t]||'자료'} function categoryLabel(c){return CATEGORY_LABELS[c]||'기타'} function statusLabel(s){return STATUS_LABELS[s]||'종료'}";
  const block=`const POST_TYPES=new Set(['notice','post','article','reference']);
function soopPostId(value=''){try{const u=new URL(String(value||''),'https://chunbong-fansite.vercel.app/');if(!/(^|\\.)sooplive\\.com$/i.test(u.hostname))return'';const match=u.pathname.match(/\\/station\\/chunbongtv\\/post\\/(\\d+)/i);return match?match[1]:''}catch{return''}}
function canonicalPostUrl(value=''){const raw=String(value||'').trim();if(!raw)return'';const url=safeUrl(raw);if(!url)return'';try{const u=new URL(url);u.hash='';u.search='';u.hostname=u.hostname.toLowerCase();if(u.pathname!=='/')u.pathname=u.pathname.replace(/\\/+$/,'');return u.href}catch{return''}}
function fallbackPostKey(row={}){const id=String(row.id||'').trim();if(id)return'row:'+id;const identity=[row.type,row.title,row.date,row.datePrecision,row.sourceId,row.note].map(value=>normalize(value)).join('|');return'fallback:'+identity}
function postCanonicalKey(row={}){const raw=String(row.url||'').trim();if(raw){const url=safeUrl(raw);if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}}return fallbackPostKey(row)}
function postTitleQuality(row={}){const title=String(row.title||'').trim();if(!title)return 0;const compact=title.replace(/\\s+/g,' ').trim();if(/^\\d+$/.test(compact))return 1;if(/^(?:.*\\s)?공식\\s*게시글(?:\\s*[·#:\\-]?\\s*\\d+)?$/i.test(compact)||/^게시글(?:\\s*[·#:\\-]?\\s*\\d+)?$/i.test(compact))return 2;return 20+Math.min([...compact].length,120)}
function postDateQuality(row={}){const date=String(row.date||'').trim(),precision=String(row.datePrecision||'unknown');if(precision==='day'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(date))return 3;if(precision==='month'&&/^\\d{4}-\\d{2}$/.test(date))return 2;if(precision==='year'&&/^\\d{4}$/.test(date))return 1;return 0}
function postUrlQuality(row={}){const raw=String(row.url||'').trim();if(!raw)return 0;const url=safeUrl(raw);if(!url)return 0;return soopPostId(url)?3:2}
function mergePostRows(primary={},candidate={}){
  const primaryScore=postTitleQuality(primary)*10+postDateQuality(primary)*4+postUrlQuality(primary),candidateScore=postTitleQuality(candidate)*10+postDateQuality(candidate)*4+postUrlQuality(candidate);
  const base=candidateScore>primaryScore?candidate:primary,other=base===candidate?primary:candidate;
  const titleSource=postTitleQuality(candidate)>postTitleQuality(primary)?candidate:primary;
  const dateSource=postDateQuality(candidate)>postDateQuality(primary)?candidate:primary;
  const urlSource=postUrlQuality(candidate)>postUrlQuality(primary)?candidate:primary;
  return {...base,title:titleSource.title||base.title||other.title||'',date:dateSource.date||'',datePrecision:dateSource.datePrecision||'unknown',url:urlSource.url||base.url||other.url||'',note:base.note||other.note||'',thumbnail:base.thumbnail||other.thumbnail||'',sourceId:base.sourceId||other.sourceId||''};
}
function normalizePostRows(item={}){
  const map=new Map();
  for(const row of [...(item.timeline||[]),...(item.media||[])]){if(!row||!POST_TYPES.has(row.type))continue;const key=postCanonicalKey(row);map.set(key,map.has(key)?mergePostRows(map.get(key),row):{...row})}
  return [...map.values()].sort((a,b)=>{const qa=postDateQuality(a),qb=postDateQuality(b);if(Boolean(qa)!==Boolean(qb))return qb-qa;if(qa&&qb){const dateOrder=String(b.date||'').localeCompare(String(a.date||''));if(dateOrder)return dateOrder;const aid=soopPostId(a.url),bid=soopPostId(b.url);if(aid&&bid){const numeric=Number(bid)-Number(aid);if(numeric)return numeric}}return postCanonicalKey(a).localeCompare(postCanonicalKey(b),'ko')});
}
`;
  source=replaceOnce(source,anchor,block+anchor,'material_type_anchor');
  const apiOld="const api={formatDate,formatRange,filterItems,sortItems,materialTypeLabel,categoryLabel,statusLabel,allPeople,itemPeopleCount,searchableText,contentPath,cloudinaryVariant};";
  const apiNew="const api={formatDate,formatRange,filterItems,sortItems,materialTypeLabel,categoryLabel,statusLabel,allPeople,itemPeopleCount,searchableText,contentPath,cloudinaryVariant,postCanonicalKey,mergePostRows,normalizePostRows};";
  source=replaceOnce(source,apiOld,apiNew,'api_exports');
  fs.writeFileSync(path,source);
}

function task1EmptyUrl(){
  const path='chunbong-contents.js';
  let source=fs.readFileSync(path,'utf8');
  source=replaceOnce(source,
    "function canonicalPostUrl(value=''){const url=safeUrl(value);if(!url)return'';try{const u=new URL(url);",
    "function canonicalPostUrl(value=''){const raw=String(value||'').trim();if(!raw)return'';const url=safeUrl(raw);if(!url)return'';try{const u=new URL(url);",
    'canonical_empty_url');
  source=replaceOnce(source,
    "function postCanonicalKey(row={}){const url=safeUrl(row.url||'');if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}return fallbackPostKey(row)}",
    "function postCanonicalKey(row={}){const raw=String(row.url||'').trim();if(raw){const url=safeUrl(raw);if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}}return fallbackPostKey(row)}",
    'post_key_empty_url');
  source=replaceOnce(source,
    "function postUrlQuality(row={}){const url=safeUrl(row.url||'');if(!url)return 0;return soopPostId(url)?3:2}",
    "function postUrlQuality(row={}){const raw=String(row.url||'').trim();if(!raw)return 0;const url=safeUrl(raw);if(!url)return 0;return soopPostId(url)?3:2}",
    'post_url_quality_empty_url');
  fs.writeFileSync(path,source);
}

if(trigger.task==='task1-normalization')task1();
else if(trigger.task==='task1-empty-url')task1EmptyUrl();
else throw new Error(`unknown_task_${trigger.task}`);
