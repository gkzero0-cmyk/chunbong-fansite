import assert from 'node:assert/strict';
import fs from 'node:fs';

const historyCss=fs.readFileSync(new URL('../operator-history-audit.css',import.meta.url),'utf8');
const redisCss=fs.readFileSync(new URL('../operator-redis-diagnostics.css',import.meta.url),'utf8');
const budgetCss=fs.readFileSync(new URL('../operator-budget-extra.css',import.meta.url),'utf8');
const operatorUx=fs.readFileSync(new URL('../operator-redis-diagnostics-core.js',import.meta.url),'utf8');

assert.doesNotMatch(historyCss,/font-size:(?:8|9|10)px/,'broadcast-history audit text should not fall below 11px');
assert.doesNotMatch(redisCss,/font-size:10px/,'Redis diagnostics helper text should not fall below 11px');
assert.match(budgetCss,/\.operator-feedback-filters input,[\s\S]*?\.operator-feedback-memo textarea[\s\S]*?min-height:44px!important/,'mobile operator form controls should expose 44px touch targets');
assert.match(operatorUx,/function installOperatorTabKeyboardUX\(/,'operator tabs should install keyboard navigation');
assert.match(operatorUx,/ArrowLeft/,'operator tabs should support ArrowLeft');
assert.match(operatorUx,/ArrowRight/,'operator tabs should support ArrowRight');
assert.match(operatorUx,/Home/,'operator tabs should support Home');
assert.match(operatorUx,/End/,'operator tabs should support End');
assert.match(operatorUx,/setAttribute\('tabindex'/,'operator tabs should use roving tabindex');

console.log('operator accessibility polish regression: ok');
