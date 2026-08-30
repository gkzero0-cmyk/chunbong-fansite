const SOOP_ID = 'chunbongtv';
const NOTICE_BOARD_NUMBERS = ['126448625', '126448677'];
const BOARD_NUMBER = NOTICE_BOARD_NUMBERS[0];
const CAFE_ID = '31591439';
const FANART_MENU_ID = '18';
const FANART_BOARD = `https://cafe.naver.com/f-e/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}?viewType=I`;

const soopHeaders = {
  'user-agent': 'Mozilla/5.0 (compatible; ChunbongFanHub/3.1)',
  accept: 'application/json,text/plain,*/*',
  referer: 'https://www.sooplive.com/'
};
const naverHeaders = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  accept: 'application/json,text/plain,*/*',
  referer: `https://cafe.naver.com/ca-fe/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}?viewType=I`,
  origin: 'https://cafe.naver.com'
};

const first = (obj, keys) => keys.map(key => obj?.[key]).find(value => value !== undefined && value !== null && value !== '');
function deepFirst(obj, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((cur, key) => cur?.[key], obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}
const clean = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function structuredText(value, seen = new Set()) {
  if (value === null || value === undefined || value === false) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return '';
  if (typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => structuredText(item, seen)).filter(Boolean).join('\n');

  const priorityKeys = ['text','plainText','plain_text','html','contentHtml','content_html','children','nodes','blocks','items','content','contents','document','body','value'];
  const parts = [];
  for (const key of priorityKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const part = structuredText(value[key], seen);
      if (part) parts.push(part);
    }
  }
  if (parts.length) return parts.join('\n');

  const skip = /^(id|type|kind|nodeType|contentType|title_no|titleNo|board_number|boardNumber|reg_date|regDate|write_date|writeDate|src|href|url|link|linkUrl|link_url|imageUrl|image_url|imgUrl|img_url|alt|width|height|style|class|className)$/i;
  for (const [key, child] of Object.entries(value)) {
    if (skip.test(key)) continue;
    const part = structuredText(child, seen);
    if (part) parts.push(part);
  }
  return parts.join('\n');
}
const cleanContent = (value = '') => structuredText(value)
  .replace(/<\s*br\s*\/?\s*>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/[ \t]+/g, ' ')
  .replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

async function getJson(url, requestHeaders = soopHeaders) {
  const response = await fetch(url, { headers: requestHeaders });
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  return response.json();
}
function listFrom(payload) {
  const candidates = [
    payload?.contents, payload?.data,
    payload?.data?.contents, payload?.data?.items, payload?.data?.list, payload?.data?.articles,
    payload?.data?.vods, payload?.data?.catchList, payload?.data?.catch_list, payload?.data?.catches,
    payload?.result?.contents, payload?.result?.items, payload?.result?.list, payload?.result?.articles,
    payload?.result?.articleList, payload?.result?.catchList, payload?.result?.catch_list,
    payload?.message?.result?.articleList, payload?.message?.result?.articles,
    payload?.items, payload?.list, payload?.articles, payload?.vods, payload?.catchList, payload?.catch_list, payload?.catches
  ];
  return candidates.find(Array.isArray) || [];
}
function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'number') { const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10); }
  return String(value).slice(0, 10);
}
function imageUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(imageUrl).find(Boolean) || '';
  if (typeof value === 'object') return first(value, ['url','src','imageUrl','image_url','thumb','thumbnail']) || imageUrl(value.image) || '';
  return '';
}
function normalizeVideo(item, kind = 'vod') {
  const id = kind === 'catch'
    ? deepFirst(item, ['title_no','titleNo','catch_no','catchNo','catch_no','story_no','storyNo','story_idx','storyIdx','vod_no','vodNo','id'])
    : deepFirst(item, ['title_no','titleNo','vod_no','vodNo','id']);
  const title = clean(deepFirst(item, ['title_name','titleName','title','subject','catch_title','catchTitle','story_title','storyTitle','name']) || (kind === 'catch' ? '춘봉 Catch' : kind === 'clip' ? '춘봉 클립' : '춘봉 영상'));
  const explicitLink = deepFirst(item, ['url','linkUrl','link_url','shareUrl','share_url','catchUrl','catch_url','link.url']);
  const baseLink = kind === 'catch' ? (id ? `https://vod.sooplive.com/player/${id}/catch` : `https://www.sooplive.com/station/${SOOP_ID}/catch`) : (id ? `https://vod.sooplive.com/player/${id}/` : `https://www.sooplive.com/station/${SOOP_ID}/vod/clip`);
  const thumbValue = deepFirst(item, ['thumb','thumb_url','thumbnail_url','image_url','thumbnailUrl','thumbUrl','catchThumbnail','catch_thumbnail','thumbnail','image','contentImage']);
  const views = deepFirst(item, ['view_count','viewCount','read_cnt','readCnt','views','hit']);
  return {
    id: id ? String(id) : '', kind, title,
    date: normalizeDate(deepFirst(item, ['reg_date','regDate','write_date','writeDate','createdAt','created_at'])),
    thumb: imageUrl(thumbValue),
    meta: views === undefined ? '' : `조회수 ${Number(views).toLocaleString('ko-KR')}`,
    link: explicitLink || baseLink,
    embed: id ? `https://vod.sooplive.com/player/${id}/embed?showChat=false&autoPlay=false&mutePlay=false` : ''
  };
}
function normalizePost(item) {
  const id = first(item, ['title_no','post_no','postNo','article_no','articleNo','bbs_no','bbsNo']);
  const rawContent = first(item, ['contents','content','memo','contentHtml','body']) || '';
  const content = cleanContent(rawContent).slice(0, 12000);
  const boardValue = deepFirst(item, ['board_number','boardNumber','board_no','boardNo','menu_no','menuNo','board.board_number','board.boardNumber','board.board_no','board.id','boardInfo.board_number','boardInfo.boardNumber']);
  return { id: id ? String(id) : '', boardNumber: boardValue === undefined || boardValue === null || boardValue === '' ? '' : String(boardValue), category: 'NOTICE', title: clean(first(item, ['title','subject','title_name','titleName']) || '춘봉 공지'), date: normalizeDate(first(item, ['reg_date','regDate','write_date','writeDate'])), desc: content.slice(0,180), content, link: id ? `https://www.sooplive.com/station/${SOOP_ID}/post/${id}` : `https://www.sooplive.com/station/${SOOP_ID}/board/${BOARD_NUMBER}` };
}
async function fetchFirstNonEmpty(urls, normalizer, requestHeaders = soopHeaders) {
  let lastError;
  for (const url of urls) { try { const raw = listFrom(await getJson(url, requestHeaders)); if (raw.length) return raw.map(normalizer).filter(Boolean); } catch (error) { lastError = error; } }
  if (lastError) throw lastError;
  return [];
}
module.exports = { SOOP_ID, BOARD_NUMBER, NOTICE_BOARD_NUMBERS, CAFE_ID, FANART_MENU_ID, FANART_BOARD, soopHeaders, naverHeaders, first, deepFirst, clean, structuredText, getJson, listFrom, normalizeDate, normalizeVideo, normalizePost, fetchFirstNonEmpty };
