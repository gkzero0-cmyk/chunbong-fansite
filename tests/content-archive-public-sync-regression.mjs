import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const pageRuntime=read('chunbong-contents.js');
const archiveApi=read('lib/chunbong-content-archive-api.js');
const workflow=read('.github/workflows/push-dispatch.yml');
const operator=read('operator-contents.js');

assert.doesNotMatch(pageRuntime,/refreshAfterAutoSync/,'public archive page must not trigger collection after rendering');
assert.doesNotMatch(pageRuntime,/content-archive-auto-sync/,'public archive runtime must not POST to the archive sync endpoint');

const syncStart=archiveApi.indexOf('async function handlePublicAutoSync');
const syncEnd=archiveApi.indexOf('async function handleOperatorAutoSync',syncStart);
assert.ok(syncStart>=0&&syncEnd>syncStart,'public archive sync handler must exist');
const syncHandler=archiveApi.slice(syncStart,syncEnd);
assert.match(syncHandler,/authorizedGitHubOidc\(req\)/,'scheduled archive sync must authenticate with GitHub OIDC');
assert.match(syncHandler,/if\(!githubOidc\)return json\(res,403,\{error:'auto_sync_unauthorized'\}\)/,'non-OIDC POSTs must be rejected');
assert.doesNotMatch(syncHandler,/sameSite\?false/,'same-origin visitors must not bypass OIDC for archive collection');

assert.match(workflow,/ARCHIVE_SYNC_URL: https:\/\/chunbong-fansite\.vercel\.app\/api\/content\?type=content-archive-auto-sync/,'scheduled archive sync must remain wired');
assert.match(workflow,/Authorization: Bearer \$token/,'scheduled archive sync must send its OIDC token');
assert.match(operator,/operator-content-auto-sync/,'owner manual archive sync must remain available');

console.log('public archive sync decoupling regression passed');
