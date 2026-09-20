const { SOOP_ID, soopHeaders, first, clean, normalizeDate } = require('./_shared');
const { sanitizeHtml, structuredHtml } = require('./notice-detail');

function safeUrl(value = '') {
  let raw = String(value || '').replace(/&amp;/gi, '&').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) raw = `https:${raw}`;
  try {
    const url = new URL(raw, 'https://www.sooplive.com/');
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) { return ''; }
}

function findPost(payload, requestedId) {
  const target = String(requestedId || '');
  const seen = new Set();
  let fallback = null;
  function walk(value) {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (!Array.isArray(value)) {
      const id = first(value, ['title_no','titleNo','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']);
      const body = first(value, ['contents','content','memo','contentHtml','body','html']);
      if (body !== undefined && body !== null && body !== '') {
        if (!fallback) fallback = value;
        if (!target || !id || String(id) === target) return value;
      }
    }
    for (const child of (Array.isArray(value) ? value : Object.values(value))) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
  return walk(payload) || fallback || {};
}

function imageCandidates(value, context = '', seen = new Set()) {
  if (value === null || value === undefined || value === false) return [];
  const blockedContext = /profile|avatar|author|user|station|channel|cover|logo|icon|thumbnail|thumb/i.test(context);
  if (blockedContext) return [];
  if (typeof value === 'string') {
    const out = [];
    for (const match of value.matchAll(/<img\b[^>]*\b(?:src|data-src|data-lazy-src)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi)) {
      const url = safeUrl(match[1] || match[2]);
      if (url) out.push(url);
    }
    if (/image|img|photo|picture|attach|file/i.test(context)) {
      const url = safeUrl(value);
      if (url && /\.(?:jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(url)) out.push(url);
    }
    return [...new Set(out)];
  }
  if (typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return [...new Set(value.flatMap(item => imageCandidates(item, context, seen)))];

  const type = String(first(value, ['type','kind','nodeType','node_type','contentType','content_type']) || '');
  const out = [];
  if (/image|img|photo|picture/i.test(type) || /image|img|photo|picture|attach|file/i.test(context)) {
    for (const key of ['src','url','href','imageUrl','image_url','imgUrl','img_url','imageSrc','image_src','fileUrl','file_url']) {
      if (typeof value[key] !== 'string') continue;
      const url = safeUrl(value[key]);
      if (url) out.push(url);
    }
  }
  for (const [key, child] of Object.entries(value)) out.push(...imageCandidates(child, `${context}.${key}`, seen));
  return [...new Set(out)];
}

function extractScheduleImages(post, rawBody) {
  const out = new Set(imageCandidates(rawBody, 'contents'));
  const attachmentKeys = [
    'attachments','attachment','attach','attachList','attach_list','attachFiles','attach_files',
    'files','fileList','file_list','images','imageList','image_list','contentImages','content_images',
    'editorImages','editor_images','bodyImages','body_images'
  ];
  for (const key of attachmentKeys) {
    if (!Object.prototype.hasOwnProperty.call(post, key)) continue;
    for (const url of imageCandidates(post[key], key)) out.add(url);
  }
  return [...out].filter(url => !/(?:avatar|profile|channel[-_]?cover|station[-_]?logo|logo|icon|thumbnail|thumb)/i.test(url));
}

function extractEmbeds(rawBody) {
  if (typeof rawBody !== 'string') return [];
  const out = [];
  for (const match of rawBody.matchAll(/<(?:iframe|embed)\b[^>]*\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi)) {
    const url = safeUrl(match[1] || match[2]);
    if (url) out.push(url);
  }
  return [...new Set(out)].slice(0, 3);
}

function textFromHtml(html = '') {
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeSchedule(payload, requestedId) {
  const post = findPost(payload, requestedId);
  const id = first(post, ['title_no','titleNo','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']) || requestedId;
  const rawBody = first(post, ['contents','content','memo','contentHtml','body','html']) || '';
  const rendered = typeof rawBody === 'object' && rawBody !== null ? structuredHtml(rawBody) : String(rawBody);
  const html = sanitizeHtml(rendered);
  return {
    id: String(id || requestedId || ''),
    category: 'NOTICE',
    title: clean(first(post, ['title_name','titleName','title','subject']) || '방송 일정표'),
    date: normalizeDate(first(post, ['reg_date','regDate','write_date','writeDate'])),
    content: textFromHtml(html || String(rawBody)).slice(0, 20000),
    html,
    images: extractScheduleImages(post, rawBody).slice(0, 8),
    embeds: extractEmbeds(rawBody),
    link: `https://www.sooplive.com/station/${SOOP_ID}/post/${id || requestedId}`
  };
}

async function getJson(url) {
  const response = await fetch(url, { headers: soopHeaders });
  if (!response.ok) throw new Error(`schedule upstream ${response.status}`);
  return response.json();
}

module.exports = async function fetchScheduleDetail(id = '203015477') {
  const postId = String(id || '').trim();
  let lastError;
  for (const url of [
    `https://chapi.sooplive.com/api/${SOOP_ID}/title/${postId}`,
    `https://chapi.sooplive.co.kr/api/${SOOP_ID}/title/${postId}`
  ]) {
    try {
      const detail = normalizeSchedule(await getJson(url), postId);
      if (detail.content || detail.html || detail.images.length) return detail;
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('official schedule unavailable');
};

module.exports.normalizeSchedule = normalizeSchedule;
module.exports.extractScheduleImages = extractScheduleImages;
