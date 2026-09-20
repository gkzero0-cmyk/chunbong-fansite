import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tarotApi = fs.readFileSync(new URL('../api/tarot-reading.js', import.meta.url), 'utf8');

assert.equal(pkg.dependencies?.['@vercel/oidc'], undefined, '사용하지 않는 @vercel/oidc 런타임 의존성이 없어야 합니다.');
assert.doesNotMatch(tarotApi, /@vercel\/oidc|VERCEL_OIDC_TOKEN|getVercelOidcToken/, '현재 로컬 타로 엔진은 OIDC 런타임에 의존하면 안 됩니다.');

console.log('Unused OIDC dependency regression passed');
