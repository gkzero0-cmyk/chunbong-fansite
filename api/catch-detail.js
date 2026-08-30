const { soopHeaders, clean } = require('./_shared');

function safeHttp(value = '') {
  try {
    const url = new URL(String(value || ''));
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}

module.exports = async function fetchCatchDetail(id) {
  const catchId = String(id || '').trim();
  if (!/^\d+$/.test(catchId)) throw new Error('invalid catch id');
  const referer = `https://vod.sooplive.com/player/${catchId}/catch`;
  const body = new URLSearchParams({ nTitleNo: catchId, nApiLevel: '10', nPlaylistIdx: '0' });
  const response = await fetch('https://api.m.sooplive.com/station/video/a/view', {
    method: 'POST',
    headers: {
      ...soopHeaders,
      accept: 'application/json,text/plain,*/*',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      referer,
      origin: 'https://vod.sooplive.com',
    },
    body: body.toString(),
  });
  if (!response.ok) throw new Error(`catch playback upstream ${response.status}`);
  const payload = await response.json();
  const data = payload?.data || payload?.result || payload || {};
  const files = Array.isArray(data.files) ? data.files : [];
  const firstFile = files.find(file => safeHttp(file?.file || file?.url || '')) || {};
  const stream = safeHttp(firstFile.file || firstFile.url || '');
  if (!stream) throw new Error('catch playable file unavailable');
  const poster = safeHttp(data.thumb || data.thumbnail || data.thumb_url || data.thumbnail_url || '');
  return {
    id: catchId,
    title: clean(data.title || data.title_name || data.catchTitle || data.catch_title || '춘봉 CATCH'),
    stream,
    poster,
    duration: Number(firstFile.duration || data.total_file_duration || 0) || 0,
    link: referer,
  };
};
