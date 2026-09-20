import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personal=await readFile(new URL('../personal-hub.js',import.meta.url),'utf8');
const mobile=await readFile(new URL('../mobile-site.js',import.meta.url),'utf8');
const mobileCss=await readFile(new URL('../mobile-site.css',import.meta.url),'utf8');
const shell=await readFile(new URL('../site-shell.js',import.meta.url),'utf8');
const improvements=await readFile(new URL('../site-improvements.js',import.meta.url),'utf8');
const push=await readFile(new URL('../lib/push-notifications-api.js',import.meta.url),'utf8');
const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const pushWorkflow=await readFile(new URL('../.github/workflows/push-dispatch.yml',import.meta.url),'utf8');

assert.ok(personal.includes("alerts:{enabled:false,pushEnabled:false"),'alerts must default OFF');
assert.ok(personal.includes("data-personal-alert-toggle"),'alert ON/OFF control missing');
assert.ok(personal.includes("action:'unsubscribe'"),'OFF must unsubscribe background push');

assert.ok(improvements.includes("header-myhub"),'desktop MY fan hub entry missing');
assert.ok(improvements.includes("link.href='myhub.html'"),'desktop MY fan hub link missing');
assert.ok(shell.length<12500,'shared site shell must remain within its size budget');
assert.ok(mobile.includes("action.className='pwa-header-action'"),'mobile PWA MY action should remain');
assert.ok(mobile.includes('mobileHeaderAutoHide'),'mobile header auto-hide behavior missing');
assert.ok(mobileCss.includes('flex-wrap:nowrap!important'),'mobile PWA header must stay in one row');
assert.ok(mobileCss.includes('.pwa-app-mode .site-header.pwa-compact-header .site-search-trigger{order:4!important'),'search order missing');
assert.ok(!mobileCss.includes('.pwa-header-action{display:none!important}'),'mobile PWA MY action must not be hidden');
assert.ok(!mobileCss.includes('height:46px!important;min-height:46px!important'),'mobile header must keep its original size');

assert.ok(mobile.includes("chunbong:haptics:v1"),'optional haptics setting missing');
assert.ok(mobile.includes("data-pwa-live-state"),'installed-app LIVE badge missing');

assert.ok(push.includes('resolveVapid'),'managed VAPID resolution missing');
assert.ok(push.includes("push:vapid:v1"),'managed VAPID Redis key missing');
assert.ok(push.includes('authorizedGitHubOidc'),'GitHub OIDC dispatch authorization missing');
assert.ok(push.includes("push:dispatch-lock:v1"),'push dispatch lock missing');
assert.ok(pushWorkflow.includes("cron: '*/5 * * * *'"),'5-minute GitHub push schedule missing');
assert.ok(pushWorkflow.includes('id-token: write'),'GitHub OIDC permission missing');
assert.ok(pushWorkflow.includes('chunbong-fansite-push'),'Push OIDC audience missing');
assert.ok(pushWorkflow.includes('/api/content?type=push-dispatch'),'Push workflow must reuse the content API');
assert.ok(push.includes("dispatchAuth:'github-oidc-v1'"),'Push config capability marker missing');
assert.ok(pushWorkflow.includes("dispatch_auth")&&pushWorkflow.includes("github-oidc-v1"),'Push workflow must wait for compatible production');
assert.ok(!Array.isArray(vercel.crons)||vercel.crons.length===0,'Hobby deployment must not register a minute-level Vercel cron');

console.log('mobile-finish-regression: ok');
