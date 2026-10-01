'use strict';

const contentArchive=require('./chunbong-content-archive-api');
const {repairPublicArchiveItem}=require('./chunbong-content-browser-meta');

function forwardingResponse(res,transform){
  let statusCode=200;
  const proxy={
    setHeader(name,value){res.setHeader(name,value);return proxy},
    status(code){statusCode=code;return proxy},
    json(payload){
      const next=transform(payload,statusCode);
      return res.status(statusCode).json(next);
    },
    send(payload){
      const next=transform(payload,statusCode);
      return res.status(statusCode).send(next);
    },
    end(payload){return res.status(statusCode).end(payload)}
  };
  return proxy;
}
async function handlePublicDetail(req,res){
  return contentArchive.handlePublicDetail(req,forwardingResponse(res,(payload,statusCode)=>{
    if(statusCode!==200||!payload?.item)return payload;
    return{...payload,item:repairPublicArchiveItem(payload.item)};
  }));
}
module.exports={handlePublicDetail,_internals:{forwardingResponse}};
