const SOURCE_URL='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';
const CONTENT_URL=new URL('/api/content',SOURCE_URL).href;

function htmlDecode(value=''){
  return String(value).replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/').replace(/&quot;/g,'"');
}
function safePublicUrl(value){
  try{
    const url=new URL(String(value||''),SOURCE_URL);
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))return null;
    if(/^\d+\.\d+\.\d+\.\d+$/.test(host))return null;
    return url;
  }catch{return null}
}
function addUrl(set,value){
  const raw=htmlDecode(String(value||'').trim());
  if(!raw||raw.startsWith('data:')||raw.startsWith('blob:'))return;
  const url=safePublicUrl(raw);if(url)set.add(url.href);
}
function imageCandidates(html,set=new Set()){
  const source=String(html||'');
  for(const match of source.matchAll(/<(?:img|source)\b[^>]*>/gi)){
    const tag=match[0];
    for(const attr of ['src','data-src','data-original','data-lazy-src']){
      const found=tag.match(new RegExp('\\b'+attr+'\\s*=\\s*["\\\']([^"\\\']+)["\\\']','i'));if(found)addUrl(set,found[1]);
    }
    const srcset=tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1]||'';
    srcset.split(',').forEach(row=>addUrl(set,row.trim().split(/\s+/)[0]));
  }
  for(const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))addUrl(set,match[1]);
  return set;
}
function contentImageCandidates(value,set=new Set(),key=''){
  if(Array.isArray(value)){value.forEach(row=>contentImageCandidates(row,set,key));return set}
  if(value&&typeof value==='object'){
    for(const [childKey,child] of Object.entries(value))contentImageCandidates(child,set,childKey);
    return set;
  }
  if(typeof value!=='string')return set;
  if(/<\s*(?:img|source)\b/i.test(value)||/url\(/i.test(value))imageCandidates(value,set);
  if(/^(?:src|icon|image|imageUrl|image_url)$/i.test(key))addUrl(set,value);
  return set;
}
function officialGroups(html=''){
  const match=String(html).match(/const\s+groups\s*=\s*\[([^\]]+)\]/);
  if(!match)return[];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(row=>row[1]).filter(Boolean);
}
async function fetchOfficial(url,accept){
  const response=await fetch(url,{headers:{accept,'user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0; +https://chunbong-fansite.vercel.app/)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('official_'+response.status);
  return response;
}
async function sourceHtml(){
  const response=await fetchOfficial(SOURCE_URL,'text/html,application/xhtml+xml');
  const html=await response.text();
  if(!html||html.length<200)throw new Error('empty_source');
  return html;
}
async function officialContent(){
  const response=await fetchOfficial(CONTENT_URL,'application/json');
  const payload=await response.json();
  if(!payload?.wiki||!Array.isArray(payload.wiki.pages))throw new Error('invalid_official_content');
  return payload;
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  const mode=String(req.query?.mode||'content');
  try{
    if(mode==='source'){
      const html=await sourceHtml();
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('X-Survival-Wiki-Source',SOURCE_URL);
      return res.status(200).send(html);
    }
    if(mode==='content'){
      const [html,payload]=await Promise.all([sourceHtml(),officialContent()]);
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('X-Survival-Wiki-Source',SOURCE_URL);
      return res.status(200).json({...payload,officialGroups:officialGroups(html),officialSource:SOURCE_URL});
    }
    if(mode!=='image')return res.status(400).json({error:'invalid_mode'});
    const target=safePublicUrl(req.query?.url);
    if(!target)return res.status(400).json({error:'invalid_image_url'});
    const [html,payload]=await Promise.all([sourceHtml(),officialContent()]);
    const allowed=contentImageCandidates(payload,imageCandidates(html));
    if(!allowed.has(target.href))return res.status(403).json({error:'image_not_referenced_by_official_wiki'});
    const response=await fetch(target,{headers:{accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',referer:SOURCE_URL,'user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0; +https://chunbong-fansite.vercel.app/)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('image_'+response.status);
    const type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!type.startsWith('image/'))throw new Error('not_image');
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'official_wiki_unavailable',message:String(error?.message||error)});
  }
};

module.exports._internals={SOURCE_URL,CONTENT_URL,imageCandidates,contentImageCandidates,safePublicUrl,officialGroups};
