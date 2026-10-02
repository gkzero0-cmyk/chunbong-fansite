import assert from 'node:assert/strict';
import fs from 'node:fs';

const userscript=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const guard=fs.readFileSync(new URL('../operator-soop-recapture-guard.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

const redirects=vercel.redirects||[],rewrites=vercel.rewrites||[];
const operatorRedirect=redirects.find(row=>row?.source==='/operator');
const legacyRedirect=redirects.find(row=>row?.source==='/operator.html');
const operatorHtmlRewrite=rewrites.find(row=>row?.source==='/operator.html');

assert.equal(operatorRedirect?.destination,'/operator.html','canonical /operator should land on the userscript-matched operator.html route');
assert.equal(operatorRedirect?.permanent,false,'operator compatibility redirect should stay temporary');
assert.equal(legacyRedirect,undefined,'operator.html must not redirect away before Tampermonkey can inject');
assert.equal(operatorHtmlRewrite?.destination,'/api/survival-wiki?mode=operator-page','operator.html must preserve the authenticated server-rendered operator page');

assert.match(userscript,/\/\/ @version\s+1\.4\.6\b/,'route fix should preserve the already-installed userscript');
assert.match(userscript,/\/\/ @match\s+https:\/\/chunbong-fansite\.vercel\.app\/operator\.html\*/,'existing v1.4.6 operator match remains authoritative');
assert.match(guard,/MIN_COLLECTOR_VERSION='1\.4\.6'/,'existing handshake should continue to accept v1.4.6');

console.log('SOOP collector operator route compatibility regression passed');
