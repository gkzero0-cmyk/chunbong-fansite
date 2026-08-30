import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

for (const key of Object.keys(require.cache)) {
  if (key.includes('/api/')) delete require.cache[key];
}

const fetchClips = require('../api/clips.js');
const calls = [];

global.fetch = async (url) => {
  const value = String(url);
  calls.push(value);

  if (value.includes('api-channel.sooplive.com') && value.includes('/vod/catch')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { catchList: [
        { catchNo: 220000002, catchTitle: '방송국 CATCH 최신', regDate: '2026-08-31 08:20:00', catchUrl: 'https://vod.sooplive.com/player/220000002/catch' },
        { catchNo: 220000001, catchTitle: '방송국 CATCH 이전', regDate: '2026-08-31 08:10:00', catchUrl: 'https://vod.sooplive.com/player/220000001/catch' }
      ] } })
    };
  }

  if (value.includes('/vods/catch')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { catchList: [
        { catchNo: 999999999, catchTitle: '방송국 페이지에 없는 보조 API 항목', regDate: '2026-08-31 09:00:00', catchUrl: 'https://vod.sooplive.com/player/999999999/catch' }
      ] } })
    };
  }

  return { ok: true, status: 200, json: async () => ({ data: [] }) };
};

const result = await fetchClips();
assert.deepEqual(
  result.catch.map(item => item.id),
  ['220000002', '220000001'],
  'when the station CATCH source has rows, only those rows should be exposed'
);
assert.ok(calls.some(url => url.includes('api-channel.sooplive.com') && url.includes('/vod/catch')));
assert.ok(
  !calls.some(url => url.includes('/vods/catch')),
  'fallback CATCH endpoints must not be merged when the station source is available'
);

console.log('station CATCH source regression test passed');
