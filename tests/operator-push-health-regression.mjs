'use strict';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const push=fs.readFileSync('lib/push-notifications-api.js','utf8');
const operatorApi=fs.readFileSync('lib/operator-center-api.js','utf8');
const operatorUi=fs.readFileSync('operator.js','utf8');

assert.match(push,/async function status\(\{probe=false\}=\{\}\)/,'Push API should expose a read-only health status probe');
assert.match(push,/status,resolveVapid/,'Push health status should be exported for operator diagnostics');
assert.match(operatorApi,/const pushNotifications=require\('\.\/push-notifications-api'\)/,'operator system status should use the Push module as the source of truth');
assert.doesNotMatch(operatorApi,/\['GET','push:vapid:v1'\]/,'operator Redis must not be queried for realtime Push VAPID state');
assert.match(operatorApi,/pushNotifications\._internals\.status\(\{probe:deepStorage\}\)/,'detailed system status should probe the realtime Push store');
assert.match(operatorApi,/push:pushState\.checked\?pushState\.ready:null/,'unprobed Push state should be represented as unknown, not failed');
assert.match(operatorUi,/function healthLabel\(ok\)\{if\(ok===null\|\|ok===undefined\)/,'service health UI should render an unknown state without a false failure');
assert.match(operatorUi,/services\.push===false/,'operator attention should warn only after a checked Push failure');
assert.doesNotMatch(operatorUi,/!services\.push&&'Push'/,'unprobed Push state must not create a warning');

console.log('operator Push health tri-state regression passed');
