import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js=await readFile(new URL('../mobile-site.js',import.meta.url),'utf8');
const css=await readFile(new URL('../mobile-site.css',import.meta.url),'utf8');
const shell=await readFile(new URL('../site-shell.js',import.meta.url),'utf8');
const improvements=await readFile(new URL('../site-improvements.js',import.meta.url),'utf8');

assert.ok(js.includes("action.className='pwa-header-action'"),'mobile PWA MY action must remain');
assert.ok(js.includes("mobileHeaderAutoHide"),'mobile auto-hide behavior missing');
assert.ok(js.includes("mobile-header-hidden"),'mobile hidden state missing');
assert.ok(js.includes("delta>6&&y>72"),'scroll-down hide threshold missing');
assert.ok(js.includes("delta<-4"),'scroll-up reveal missing');

assert.ok(css.includes(".site-header.mobile-header-hidden"),'mobile hidden header style missing');
assert.ok(css.includes("transform:translateY(calc(-100% - env(safe-area-inset-top)))"),'mobile header should move out of view');
assert.ok(!css.includes(".pwa-header-action{display:none!important}"),'MY action must not be removed');
assert.ok(!css.includes("height:46px!important;min-height:46px!important"),'header must not be shrunk');

assert.ok(improvements.includes("header-myhub"),'desktop MY fan hub button should remain');
assert.ok(shell.length<12500,'shared shell should stay within its size budget');

console.log('mobile-header-autohide-regression: ok');
