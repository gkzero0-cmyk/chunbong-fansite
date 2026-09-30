import fs from 'node:fs';

const path='api/crew-news.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(from,to){
  if(source.includes(to))return;
  if(!source.includes(from))throw new Error('Expected crew-news source fragment not found');
  source=source.replace(from,to);
}

replaceOnce("'use strict';\n\nconst SOOP_BOARD_HOSTS", "'use strict';\n\nconst operatorObservability=require('../lib/operator-observability');\n\nconst SOOP_BOARD_HOSTS");
replaceOnce(
"module.exports = async function handler(req, res) {\n  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });\n\n  const requestUrl",
"module.exports = async function handler(req, res) {\n  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });\n  if(typeof res?.json==='function'){\n    const originalJson=res.json.bind(res);\n    res.json=payload=>{try{operatorObservability.recordCollectorResult('crew-news',payload)}catch{}return originalJson(payload)};\n  }\n\n  const requestUrl"
);

fs.writeFileSync(path,source);
console.log('crew-news observability patch applied');
