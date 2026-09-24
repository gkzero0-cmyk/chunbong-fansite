const { naverHeaders } = require('../lib/content-api/_shared');

const SOOP_IMAGE_HOSTS = new Set([
  'stimg.sooplive.com',
  'stimg.sooplive.co.kr',
  'res.sooplive.com',
  'res.sooplive.co.kr',
  'vodimg.sooplive.com',
  'vodimg.sooplive.co.kr',
  'liveimg.sooplive.com',
  'liveimg.sooplive.co.kr',
  'stimg.afreecatv.com',
  'liveimg.afreecatv.com'
]);

function sourceType(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:') return '';
    if (
      host.endsWith('.pstatic.net') ||
      host.endsWith('.naver.net') ||
      host === 'ssl.pstatic.net'
    ) return 'naver';
    if (SOOP_IMAGE_HOSTS.has(host)) return 'soop';
    return '';
  } catch (_) {
    return '';
  }
}

function allowed(url) {
  return Boolean(sourceType(url));
}

module.exports = async function handler(req, res) {
  const requestUrl = new URL(req.url || '/', 'https://chunbong.local');
  const url = requestUrl.searchParams.get('url') || '';
  const type = sourceType(url);
  if (!url || !type) return res.status(400).send('invalid image url');
  try {
    const headers = type === 'naver'
      ? { ...naverHeaders, accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' }
      : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.sooplive.com/'
        };
    const response = await fetch(url, { headers, redirect: 'follow' });
    if (!response.ok) return res.status(response.status).send('image upstream error');
    const contentType = response.headers.get('content-type') || '';
    if (!/^image\//i.test(contentType)) return res.status(415).send('upstream is not image');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(Buffer.from(await response.arrayBuffer()));
  } catch (_) {
    return res.status(502).send('image proxy error');
  }
};

module.exports._internals = { allowed, sourceType, SOOP_IMAGE_HOSTS };
