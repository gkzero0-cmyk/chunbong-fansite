const SOURCE_URL='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';

function htmlDecode(value=''){
  return String(value).replace(/&amp;/g,'&').replace(/&#x2F;/gi,'/').replace(/&#47;/g,'/').replace(/&quot;/g,'"');
}
function imageCandidates(html){
  const urls=new Set();
  const add=value=>{
    const raw=htmlDecode(String(value||'').trim());
    if(!raw||raw.startsWith('data:')||raw.startsWith('blob:'))return;
    try{urls.add(new URL(raw,SOURCE_URL).href)}catch{}
  };
  for(const match of html.matchAll(/<(?:img|source)\b[^>]*>/gi)){
    const tag=match[0];
    for(const attr of ['src','data-src','data-original','data-lazy-src']){
      const found=tag.match(new RegExp('\\b'+attr+'\\s*=\\s*["\\\']([^"\\\']+)["\\\']','i'));if(found)add(found[1]);
    }
    const srcset=tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1]||'';
    srcset.split(',').forEach(row=>add(row.trim().split(/\s+/)[0]));
  }
  for(const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))add(match[1]);
  return urls;
}
function safePublicUrl(value){
  try{
    const url=new URL(String(value||''));
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))return null;
    if(/^\d+\.\d+\.\d+\.\d+$/.test(host))return null;
    return url;
  }catch{return null}
}
async function sourceHtml(){
  const response=await fetch(SOURCE_URL,{headers:{accept:'text/html,application/xhtml+xml','user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0; +https://chunbong-fansite.vercel.app/)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('source_'+response.status);
  return response.text();
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  try{
    const target=safePublicUrl(req.query?.url);
    if(!target)return res.status(400).json({error:'invalid_image_url'});
    const html=await sourceHtml();
    const allowed=imageCandidates(html);
    if(!allowed.has(target.href))return res.status(403).json({error:'image_not_referenced_by_official_wiki'});
    const response=await fetch(target,{headers:{accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',referer:SOURCE_URL,'user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0; +https://chunbong-fansite.vercel.app/)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('image_'+response.status);
    const type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!type.startsWith('image/'))throw new Error('not_image');
    const bytes=Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(bytes);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'official_wiki_image_unavailable',message:String(error?.message||error)});
  }
};

module.exports.imageCandidates=imageCandidates;
module.exports.safePublicUrl=safePublicUrl;
module.exports.SOURCE_URL=SOURCE_URL;
