import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeVideo } = require('../api/_shared.js');

const catchItem = normalizeVideo({ catchNo: 123456789, catchTitle: '재생 테스트' }, 'catch');
assert.match(
  catchItem.embed || '',
  /^https:\/\/vod\.sooplive\.co\.kr\/player\/123456789\/embed\?type=catch(?:&|$)/,
  'CATCH should use the official embeddable player'
);

const scheduleHtml = fs.readFileSync(new URL('../schedule.html', import.meta.url), 'utf8');
assert.doesNotMatch(
  scheduleHtml,
  /schedule-official|공식 일정 안내|SOOP OFFICIAL SCHEDULE/,
  'official schedule section should be removed'
);

const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');
assert.doesNotMatch(
  pageJs,
  /schedule-official|공식 일정 안내|SOOP 공식 일정|203015477/,
  'removed official schedule must not remain as dormant page runtime code'
);

const liveFixes = fs.readFileSync(new URL('../live-fixes.js', import.meta.url), 'utf8');
assert.doesNotMatch(
  liveFixes,
  /catch-detail|playCatch\s*\(/,
  'CATCH should not be overridden by direct CDN playback'
);
assert.doesNotMatch(
  liveFixes,
  /#schedule-official/,
  'schedule refresh should not depend on removed official schedule markup'
);

console.log('catch playback + schedule removal regression test passed');
