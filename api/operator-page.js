'use strict';

const fs=require('node:fs');
const path=require('node:path');
const operatorCenter=require('../lib/operator-center-api');

function captureResponse(){
  return{
    statusCode:200,
    headers:{},
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value},
    status(code){this.statusCode=code;return this},
    json(payload){this.payload=payload;return this},
    end(){return this}
  };
}

function authenticationOnlyHtml(source=''){
  const start=source.indexOf('<section id="operator-dashboard"');
  const end=start>=0?source.indexOf('</main>',start):-1;
  let html=source;
  if(start>=0&&end>start){
    html=source.slice(0,start)+'<section id="operator-dashboard" data-auth-shell="1" hidden></section>\n'+source.slice(end);
  }
  return html.replace(/<script\s+src=["']operator\.js[^"']*["'][^>]*><\/script>/i,'<script src="operator-auth.js?v=1"></script>');
}

function sendHtml(res,status,html){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vary','Cookie');
  res.statusCode=status;
  return res.end(html);
}

module.exports=async function handler(req,res){
  if(String(req.method||'GET').toUpperCase()!=='GET')return sendHtml(res,405,'<!doctype html><meta charset="utf-8"><title>Method Not Allowed</title>');
  let source='';
  try{source=fs.readFileSync(path.join(process.cwd(),'operator.html'),'utf8')}
  catch{return sendHtml(res,500,'<!doctype html><meta charset="utf-8"><title>Operator page unavailable</title>')}

  const capture=captureResponse();
  let owner=null;
  try{owner=await operatorCenter._internals.requireOwner(req,capture)}catch{}
  return sendHtml(res,200,owner?source:authenticationOnlyHtml(source));
};

module.exports._internals={authenticationOnlyHtml};
