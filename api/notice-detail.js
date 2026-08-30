const { SOOP_ID, BOARD_NUMBER, soopHeaders, first, clean, normalizeDate } = require('./_shared');

const SAFE_TAGS = new Set(['p','br','strong','b','em','i','u','ul','ol','li','blockquote','h1','h2','h3','h4','h5','h6','a','img','span']);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function structuredHtml(value, seen = new Set()) {
  if (value === null || value === undefined || value === false) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';
    if (/<\/?[a-z][\s\S]*>/i.test(text)) return sanitizeHtml(text);
    return escapeHtml(text).replace(/\r?\n/g, '<br>');
  }
  if (typeof value === 'number' || typeof value === 'bigint') return '';
  if (typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => structuredHtml(item, seen)).filter(Boolean).join('');

  const nodeType = String(first(value, ['type','kind','nodeType','node_type','contentType','content_type']) || '').toLowerCase();
  const directHtml = first(value, ['html','contentHtml','content_html','bodyHtml','body_html']);
  if (typeof directHtml === 'string' && directHtml.trim()) return sanitizeHtml(directHtml);

  const imageSrc = first(value, ['src','imageUrl','image_url','imgUrl','img_url','imageSrc','image_src']);
  if (imageSrc || /image|img|photo|picture/.test(nodeType)) {
    const src = safeUrl(imageSrc || first(value, ['url','href']));
    if (src) {
      const alt = clean(first(value, ['alt','caption','title','text']) || '').replace(/"/g, '&quot;');
      const caption = clean(first(value, ['caption','description']) || '');
      return `<figure><img src="${src.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
    }
  }

  const hrefRaw = first(value, ['href','linkUrl','link_url']) || (/link|anchor/.test(nodeType) ? first(value, ['url']) : '');
  if (hrefRaw) {
    const href = safeUrl(hrefRaw);
    const labelValue = first(value, ['text','label','title','name']);
    const nested = first(value, ['children','nodes','content','contents','value']);
    const label = structuredHtml(labelValue || nested || hrefRaw, seen) || escapeHtml(hrefRaw);
    return href ? `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer noopener">${label}</a>` : label;
  }

  if (/text/.test(nodeType)) {
    const textValue = first(value, ['text','value','content','contents']);
    if (textValue !== undefined) return structuredHtml(textValue, seen);
  }

  const contentKeys = ['children','nodes','blocks','items','content','contents','document','body','value','text','plainText','plain_text'];
  const innerParts = [];
  for (const key of contentKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const rendered = structuredHtml(value[key], seen);
    if (rendered) innerParts.push(rendered);
  }
  let inner = innerParts.join('');

  if (!inner) {
    const skip = /^(id|type|kind|nodeType|node_type|contentType|content_type|title_no|titleNo|board_number|boardNumber|reg_date|regDate|write_date|writeDate|src|href|url|link|linkUrl|link_url|imageUrl|image_url|imgUrl|img_url|alt|width|height|style|class|className)$/i;
    for (const [key, child] of Object.entries(value)) {
      if (skip.test(key)) continue;
      const rendered = structuredHtml(child, seen);
      if (rendered) inner += rendered;
    }
  }

  if (!inner) return '';
  if (/paragraph|para|p$/.test(nodeType)) return `<p>${inner}</p>`;
  if (/listitem|list-item|li$/.test(nodeType)) return `<li>${inner}</li>`;
  if (/unordered|bullet|ul$/.test(nodeType)) return `<ul>${inner}</ul>`;
  if (/ordered|numbered|ol$/.test(nodeType)) return `<ol>${inner}</ol>`;
  if (/quote|blockquote/.test(nodeType)) return `<blockquote>${inner}</blockquote>`;
  return inner;
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function safeUrl(value = '', base = 'https://www.sooplive.com/') {
  let raw = decodeEntities(value).trim();
  if (!raw) return '';
  if (raw.startsWith('//')) raw = `https:${raw}`;
  try {
    const url = new URL(raw, base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (_) { return ''; }
}

function safeEmbedUrl(value = '') {
  const url = safeUrl(value);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch (_) { return ''; }
}

function extractEmbedUrls(value, seen = new Set(), contextKey = '') {
  if (value === null || value === undefined || value === false) return [];
  if (typeof value === 'string') {
    const source = decodeEntities(value);
    const urls = [];
    const tagPattern = /<(?:iframe|embed|object)\b[^>]*\b(?:src|data-src|data-url)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi;
    for (const match of source.matchAll(tagPattern)) {
      const url = safeEmbedUrl(match[1] || match[2] || '');
      if (url) urls.push(url);
    }
    if (/embed|iframe|widget|external/i.test(contextKey)) {
      const direct = safeEmbedUrl(source.trim());
      if (direct) urls.push(direct);
    }
    return [...new Set(urls)];
  }
  if (typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap(item => extractEmbedUrls(item, seen, contextKey)))];
  }

  const urls = [];
  const nodeType = String(first(value, ['type','kind','nodeType','node_type','contentType','content_type']) || '');
  if (/iframe|embed|widget|external/i.test(nodeType)) {
    for (const key of ['src','url','href','embedUrl','embed_url','iframeUrl','iframe_url','dataSrc','data_src']) {
      const url = safeEmbedUrl(value[key]);
      if (url) urls.push(url);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    urls.push(...extractEmbedUrls(child, seen, key));
  }
  return [...new Set(urls)];
}

function attrValue(source, name) {
  const match = String(source).match(new RegExp(`\\b${name}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, 'i'));
  return match ? (match[1] || match[2] || '') : '';
}

function sanitizeHtml(value = '') {
  let html = String(value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|svg|math)[^>]*\/?>/gi, '');

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase();
    const closing = /^<\s*\//.test(full);
    if (!SAFE_TAGS.has(tag)) return '';
    if (closing) return tag === 'br' || tag === 'img' ? '' : `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = safeUrl(attrValue(attrs, 'href'));
      return href ? `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer noopener">` : '<span>';
    }
    if (tag === 'img') {
      const src = safeUrl(attrValue(attrs, 'src') || attrValue(attrs, 'data-src') || attrValue(attrs, 'data-lazy-src'));
      if (!src) return '';
      const alt = clean(attrValue(attrs, 'alt')).replace(/"/g, '&quot;');
      return `<img src="${src.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<${tag}>`;
  });

  return html
    .replace(/javascript\s*:/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
    .trim();
}

function textFromHtml(html = '') {
  return decodeEntities(String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function postObject(payload, requestedId) {
  const targetId = String(requestedId || '');
  const seen = new Set();
  let fallback = null;
  const walk = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (!Array.isArray(value)) {
      const valueId = first(value, ['title_no','titleNo','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']);
      const body = first(value, ['contents','content','memo','contentHtml','body','html']);
      if (body !== undefined && body !== null && body !== '') {
        if (!fallback) fallback = value;
        if (!targetId || !valueId || String(valueId) === targetId) return value;
      }
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(payload) || fallback || {};
}

function normalizeDetail(payload, requestedId) {
  const item = postObject(payload, requestedId);
  const id = first(item, ['title_no','titleNo','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']) || requestedId;
  const rawHtml = first(item, ['contents','content','memo','contentHtml','body','html']) || '';
  const renderedHtml = typeof rawHtml === 'object' && rawHtml !== null ? structuredHtml(rawHtml) : rawHtml;
  const html = sanitizeHtml(renderedHtml);
  const content = textFromHtml(html || (typeof rawHtml === 'string' ? rawHtml : '')).slice(0, 20000);
  const embeds = String(id || requestedId || '') === '203015477' ? extractEmbedUrls(rawHtml).slice(0, 3) : [];
  return {
    id: String(id || requestedId || ''),
    category: 'NOTICE',
    title: clean(first(item, ['title_name','titleName','title','subject']) || '춘봉 공지'),
    date: normalizeDate(first(item, ['reg_date','regDate','write_date','writeDate'])),
    content,
    html,
    embeds,
    link: `https://www.sooplive.com/station/${SOOP_ID}/post/${id || requestedId}`
  };
}

function extractJsonPost(html, id) {
  const scripts = [...String(html).matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim());
  const seen = new Set();
  const walk = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (!Array.isArray(value)) {
      const valueId = first(value, ['title_no','titleNo','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']);
      const body = first(value, ['contents','content','memo','contentHtml','body','html']);
      if (body && (!id || !valueId || String(valueId) === String(id))) return value;
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  for (const source of scripts) {
    if (!source || (!source.startsWith('{') && !source.startsWith('['))) continue;
    try {
      const found = walk(JSON.parse(source));
      if (found) return found;
    } catch (_) {}
  }
  const contents = String(html).match(/"contents"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (contents) {
    try { return { title_no: id, contents: JSON.parse(`"${contents[1]}"`) }; } catch (_) {}
  }
  return null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: soopHeaders });
  if (!response.ok) throw new Error(`detail upstream ${response.status}`);
  return response.json();
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { ...soopHeaders, accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`post page ${response.status}`);
  return response.text();
}

module.exports = async function fetchNoticeDetail(id) {
  const postId = String(id || '').trim();
  if (!/^\d+$/.test(postId)) throw new Error('invalid notice id');
  const apiUrls = [
    `https://chapi.sooplive.com/api/${SOOP_ID}/title/${postId}`,
    `https://chapi.sooplive.co.kr/api/${SOOP_ID}/title/${postId}`
  ];
  let lastError;
  for (const url of apiUrls) {
    try {
      const detail = normalizeDetail(await fetchJson(url), postId);
      if (detail.content || detail.html) return detail;
    } catch (error) { lastError = error; }
  }

  const pageUrls = [
    `https://www.sooplive.com/station/${SOOP_ID}/post/${postId}`,
    `https://ch.sooplive.co.kr/${SOOP_ID}/post/${postId}`
  ];
  for (const url of pageUrls) {
    try {
      const rawPost = extractJsonPost(await fetchHtml(url), postId);
      if (rawPost) {
        const detail = normalizeDetail(rawPost, postId);
        if (detail.content || detail.html) return detail;
      }
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('notice detail unavailable');
};

module.exports.sanitizeHtml = sanitizeHtml;
module.exports.structuredHtml = structuredHtml;
