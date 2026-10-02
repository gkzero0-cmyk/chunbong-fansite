import assert from 'node:assert/strict';
import fs from 'node:fs';

const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const endpoint=fs.readFileSync(new URL('../api/chunbong-content-soop-targets.js',import.meta.url),'utf8');

assert.match(collector,/@version\s+1\.4\.5/,'collector version should advance for archive-backed recovery');
assert.match(collector,/SOOP_MEDIA_COLLECTOR_VERSION=7/,'media generation should advance so zero-image captures are retried');
assert.match(collector,/\/api\/chunbong-content-soop-targets/,'backfill should fetch known public SOOP URLs from the fan-site archive');
assert.match(collector,/archiveSoopTargets/,'collector should merge archive-known SOOP targets into explicit backfill');
assert.match(collector,/naturalWidth|naturalHeight/,'fallback should use rendered image dimensions to distinguish real content media');
assert.match(collector,/isTrustedSoopMediaHost/,'fallback should stay limited to known SOOP\/Afreeca media hosts');
assert.match(collector,/querySelectorAll\(['"]img,source['"]\)/,'fallback should inspect rendered page images without hardcoding validation posts');
assert.doesNotMatch(collector,/204274449|208562045/,'recovery must remain generic');

assert.match(endpoint,/storedRows/,'target endpoint should derive from the published archive store');
assert.match(endpoint,/visibility!=='internal'/,'internal sources must never be emitted as browser backfill targets');
assert.match(endpoint,/station\\\/chunbongtv\\\/post\\\/(\\d\+)/,'only Chunbong SOOP post URLs should be accepted');
assert.match(endpoint,/new Map|new Set/,'target endpoint should deduplicate URLs');
assert.doesNotMatch(endpoint,/subscriber|BROWSER_IMPORT_PREFIX|browser-import/,'target endpoint must not expose private browser-import state');

console.log('SOOP archive target + media fallback regression passed');
