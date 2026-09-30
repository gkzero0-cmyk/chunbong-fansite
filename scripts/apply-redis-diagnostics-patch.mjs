import fs from 'node:fs';

const vodPath='lib/content-api/vod.js';
let vod=fs.readFileSync(vodPath,'utf8');
const installLine="require('../redis-command-diagnostics').installRedisCommandDiagnostics();\n";
if(!vod.includes('redis-command-diagnostics')){
  vod=installLine+vod;
  fs.writeFileSync(vodPath,vod);
}

const htmlPath='operator.html';
let html=fs.readFileSync(htmlPath,'utf8');
const css='<link rel="stylesheet" href="operator-redis-diagnostics.css?v=1">';
const js='<script type="module" src="operator-redis-diagnostics.js?v=1"></script>';
if(!html.includes('operator-redis-diagnostics.css'))html=html.replace('</head>',css+'\n</head>');
if(!html.includes('operator-redis-diagnostics.js'))html=html.replace('</body>',js+'\n</body>');
fs.writeFileSync(htmlPath,html);

console.log('Redis diagnostics runtime wiring applied.');
