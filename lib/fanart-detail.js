const { CAFE_ID, naverHeaders, first, getJson } = require('../api/_shared');

function unwrap(payload) {
  return payload?.message?.result || payload?.result || payload?.data || payload || {};
}

function contentHtml(payload) {
  const root = unwrap(payload);
  return first(root, ['contentHtml', 'content', 'html'])
    || first(root?.article || {}, ['contentHtml', 'content', 'html'])
    || first(payload?.article || {}, ['contentHtml', 'content', 'html'])
    || '';
}

function normalizeImageUrl(value = '') {
  let url = String(value || '').trim()
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function extractImages(html = '') {
  const input = String(html || '');
  const images = [];
  const seen = new Set();
  const tags = input.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const match = tag.match(/\bdata-lazy-src\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const url = normalizeImageUrl(match?.[1] || '');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push(url);
  }
  return images;
}

function collectImageUrls(value, output = [], seenObjects = new Set()) {
  if (typeof value === 'string') {
    const url = normalizeImageUrl(value);
    if (url && (/pstatic\.net|naver\.net|\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(url))) output.push(url);
    return output;
  }
  if (!value || typeof value !== 'object' || seenObjects.has(value)) return output;
  seenObjects.add(value);
  if (Array.isArray(value)) {
    value.forEach(item => collectImageUrls(item, output, seenObjects));
    return output;
  }
  Object.entries(value).forEach(([key, item]) => {
    if (/image|photo|url|src/i.test(key) || typeof item === 'object') collectImageUrls(item, output, seenObjects);
  });
  return output;
}

async function fetchFanartDetail(id) {
  const articleId = String(id || '').trim();
  if (!/^\d+$/.test(articleId)) throw new Error('invalid fanart article id');
  const payload = await getJson(
    `https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/${CAFE_ID}/articles/${articleId}`,
    naverHeaders
  );
  let images = extractImages(contentHtml(payload));
  if (!images.length) {
    const seen = new Set();
    images = collectImageUrls(payload).filter(url => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }
  return { id: articleId, images };
}

module.exports = { extractImages, fetchFanartDetail };
