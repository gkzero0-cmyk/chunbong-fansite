const { naverHeaders } = require('./_shared');

function allowed(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (
      parsed.hostname.endsWith('.pstatic.net') ||
      parsed.hostname.endsWith('.naver.net') ||
      parsed.hostname === 'ssl.pstatic.net'
    );
  } catch (_) { return false; }
}

module.exports = async function handler(req, res) {
  const url = req.query?.url;
  if (!url || !allowed(url)) return res.status(400).send('invalid image url');
  try {
    const response = await fetch(url, { headers: { ...naverHeaders, accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' } });
    if (!response.ok) return res.status(response.status).send('image upstream error');
    const type = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(Buffer.from(await response.arrayBuffer()));
  } catch (_) {
    return res.status(502).send('image proxy error');
  }
};
