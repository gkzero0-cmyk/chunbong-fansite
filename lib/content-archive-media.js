'use strict';

const crypto=require('node:crypto');

const MAX_IMAGE_BYTES=12*1024*1024;
const CLOUDINARY_HOST=/^https:\/\/res\.cloudinary\.com\//i;

function safeText(value,max=240){return String(value??'').trim().slice(0,max)}
function slug(value=''){
  return safeText(value,120).toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'archive';
}
function cloudinaryConfig(env=process.env){
  const raw=String(env.CLOUDINARY_URL||'').trim();
  if(raw){
    try{
      const url=new URL(raw);
      if(url.protocol==='cloudinary:'&&url.username&&url.password&&url.hostname){
        return{cloudName:url.hostname,apiKey:decodeURIComponent(url.username),apiSecret:decodeURIComponent(url.password)};
      }
    }catch{}
  }
  const cloudName=String(env.CLOUDINARY_CLOUD_NAME||'').trim();
  const apiKey=String(env.CLOUDINARY_API_KEY||'').trim();
  const apiSecret=String(env.CLOUDINARY_API_SECRET||'').trim();
  return cloudName&&apiKey&&apiSecret?{cloudName,apiKey,apiSecret}:null;
}
function imageUrl(value=''){
  const raw=String(value||'').trim();
  try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.toString():''}catch{return''}
}
function signature(params,secret){
  const canonical=Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='')
    .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+String(v)).join('&');
  return crypto.createHash('sha1').update(canonical+secret).digest('hex');
}
async function fetchImageBytes(src,{timeoutMs=15000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(src,{redirect:'follow',signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 ChunbongArchive/1.0','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}});
    if(!response.ok)throw new Error('guide_image_fetch_'+response.status);
    const type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!type.startsWith('image/'))throw new Error('guide_image_not_image');
    const length=Number(response.headers.get('content-length')||0);
    if(length>MAX_IMAGE_BYTES)throw new Error('guide_image_too_large');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error('guide_image_too_large');
    return{bytes,type};
  }catch(error){
    if(error?.name==='AbortError')throw new Error('guide_image_timeout');
    throw error;
  }finally{clearTimeout(timer)}
}
async function uploadImageBytes({bytes,type,publicId,config}){
  const timestamp=Math.floor(Date.now()/1000);
  const signed={overwrite:'true',public_id:publicId,timestamp};
  const form=new FormData();
  form.set('file',new Blob([bytes],{type}),publicId.split('/').pop());
  form.set('api_key',config.apiKey);
  form.set('timestamp',String(timestamp));
  form.set('public_id',publicId);
  form.set('overwrite','true');
  form.set('signature',signature(signed,config.apiSecret));
  const response=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(config.cloudName)+'/image/upload',{method:'POST',body:form});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.secure_url)throw new Error('guide_image_cloudinary_'+response.status);
  return{src:String(payload.secure_url),publicId:String(payload.public_id||publicId),width:Number(payload.width||0),height:Number(payload.height||0)};
}
async function assetizeImage(image={},options={}){
  const src=imageUrl(image.src||image.url);
  const sourceUrl=imageUrl(options.sourcePageUrl||image.sourceUrl);
  if(!src)return{...image,src:'',sourceUrl};
  if(CLOUDINARY_HOST.test(src))return{...image,src,sourceUrl:sourceUrl||image.sourceUrl||'',assetState:'permanent'};
  const previousSrc=imageUrl(options.previous?.src);
  if(CLOUDINARY_HOST.test(previousSrc)){
    return{...image,...options.previous,src:previousSrc,sourceUrl:sourceUrl||options.previous.sourceUrl||'',assetState:'permanent'};
  }
  const config=cloudinaryConfig();
  if(!config)return{...image,src,sourceUrl,assetState:'remote'};
  try{
    const {bytes,type}=await fetchImageBytes(src);
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');
    const provider=slug(options.provider||'guide');
    const itemId=slug(options.itemId||'archive');
    const publicId=['chunbong-fansite',provider,itemId,hash.slice(0,32)].join('/');
    const uploaded=await uploadImageBytes({bytes,type,publicId,config});
    return{
      ...image,src:uploaded.src,sourceUrl,assetState:'permanent',assetHash:hash,
      width:uploaded.width||Number(image.width||0),height:uploaded.height||Number(image.height||0)
    };
  }catch{
    return{...image,src,sourceUrl,assetState:'remote'};
  }
}
function imageIdentity(image={}){
  return safeText(image.originId||image.blockId||image.filename||image.alt||image.src,500);
}
async function assetizeImages(images=[],options={}){
  const previousById=new Map((options.previousImages||[]).map(row=>[imageIdentity(row),row]).filter(([id])=>id));
  const out=[];
  for(const image of Array.isArray(images)?images:[]){
    const id=imageIdentity(image);
    out.push(await assetizeImage(image,{...options,previous:id?previousById.get(id):null}));
  }
  return out;
}

module.exports={assetizeImage,assetizeImages,cloudinaryConfig,imageIdentity,CLOUDINARY_HOST};
