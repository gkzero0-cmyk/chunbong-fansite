const { CAFE_ID, FANART_MENU_ID, naverHeaders, first, getJson } = require('./content-api/_shared');

const DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;
const DETAIL_CACHE_STALE_MS = 24 * 60 * 60 * 1000;
const detailCache = new Map();

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
    .replace(/\\u002f/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) return '';
  return url.replace(/[),;]+$/, '');
}

function looksLikeImageUrl(url = '') {
  const value = String(url || '');
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(value)) return true;
  return /(?:cafeptthumb-phinf|post-phinf|blogfiles|cafefiles|phinf)\.(?:pstatic|naver)\.net/i.test(value);
}

function uniqueImages(values = []) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const url = normalizeImageUrl(value);
    if (!url || !looksLikeImageUrl(url) || seen.has(url)) continue;
    seen.add(url);
    output.push(url);
  }
  return output;
}

function extractImages(html = '') {
  const input = String(html || '');
  const images = [];
  const tags = input.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const match = tag.match(/\bdata-lazy-src\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)
      || tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (match?.[1]) images.push(match[1]);
  }

  const decoded = input
    .replace(/\\u002f/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
  const looseUrls = decoded.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  images.push(...looseUrls.filter(looksLikeImageUrl));
  return uniqueImages(images);
}

function collectImageUrls(value, output = [], seenObjects = new Set()) {
  if (typeof value === 'string') {
    const url = normalizeImageUrl(value);
    if (url && looksLikeImageUrl(url)) output.push(url);
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

function imagesFromPayload(payload) {
  const fromHtml = extractImages(contentHtml(payload));
  if (fromHtml.length) return fromHtml;
  return uniqueImages(collectImageUrls(payload));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      ...naverHeaders,
      accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
    }
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  return response.text();
}

function cachedDetail(articleId, maxAge) {
  const cached = detailCache.get(articleId);
  if (!cached || Date.now() - cached.at > maxAge || !cached.images?.length) return null;
  return { id: articleId, images: cached.images, source: cached.source, cached: true };
}

function rememberDetail(articleId, images, source) {
  const normalized = uniqueImages(images);
  if (!normalized.length) return null;
  detailCache.set(articleId, { at: Date.now(), images: normalized, source });
  if (detailCache.size > 64) {
    const oldest = [...detailCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
    if (oldest) detailCache.delete(oldest);
  }
  return { id: articleId, images: normalized, source };
}

async function fetchFanartDetail(id) {
  const articleId = String(id || '').trim();
  if (!/^\d+$/.test(articleId)) throw new Error('invalid fanart article id');

  const fresh = cachedDetail(articleId, DETAIL_CACHE_TTL_MS);
  if (fresh) return fresh;

  let lastError = null;
  try {
    const payload = await getJson(
      `https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/${CAFE_ID}/articles/${articleId}`,
      naverHeaders
    );
    const remembered = rememberDetail(articleId, imagesFromPayload(payload), 'article-api-v3');
    if (remembered) return remembered;
  } catch (error) {
    lastError = error;
  }

  const htmlFallbacks = [
    `https://m.cafe.naver.com/ca-fe/web/cafes/${CAFE_ID}/articles/${articleId}?fromList=true&menuId=${FANART_MENU_ID}`,
    `https://m.cafe.naver.com/ArticleRead.nhn?clubid=${CAFE_ID}&articleid=${articleId}&boardtype=L&menuid=${FANART_MENU_ID}`,
    `https://cafe.naver.com/ArticleRead.nhn?clubid=${CAFE_ID}&articleid=${articleId}&menuid=${FANART_MENU_ID}`
  ];

  for (const url of htmlFallbacks) {
    try {
      const html = await fetchText(url);
      const remembered = rememberDetail(articleId, extractImages(html), 'public-html');
      if (remembered) return remembered;
    } catch (error) {
      lastError = error;
    }
  }

  const stale = cachedDetail(articleId, DETAIL_CACHE_STALE_MS);
  if (stale) return { ...stale, stale: true };
  return { id: articleId, images: [], source: 'unavailable', reason: lastError?.message || 'fanart image unavailable' };
}

module.exports = { extractImages, fetchFanartDetail, imagesFromPayload };
