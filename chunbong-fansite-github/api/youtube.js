const CHANNEL = 'https://www.youtube.com/@%EC%B6%98%EB%B4%89TV';
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

async function getText(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`youtube upstream ${response.status}`);
  return response.text();
}

function extractInitialData(html) {
  const markers = ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData ='];
  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) continue;
    const start = html.indexOf('{', markerIndex + marker.length);
    if (start < 0) continue;
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); } catch (_) { break; }
        }
      }
    }
  }
  return null;
}

function textValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) return value.runs.map(run => run?.text || '').join('');
  return '';
}

function bestThumb(value) {
  const list = value?.thumbnails || value?.sources || [];
  const item = list[list.length - 1] || list[0];
  return item?.url || '';
}

function normalizeVideo(renderer) {
  const id = renderer?.videoId;
  if (!id) return null;
  return {
    id,
    kind: 'videos',
    title: textValue(renderer.title) || '춘봉TV 동영상',
    date: textValue(renderer.publishedTimeText),
    meta: textValue(renderer.viewCountText),
    thumb: bestThumb(renderer.thumbnail) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/watch?v=${id}`,
    embed: `https://www.youtube.com/embed/${id}?rel=0`,
    platform: 'youtube'
  };
}

function normalizeShort(renderer) {
  const id = renderer?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId
    || renderer?.onTap?.innertubeCommand?.watchEndpoint?.videoId
    || renderer?.navigationEndpoint?.reelWatchEndpoint?.videoId
    || renderer?.videoId;
  if (!id) return null;
  return {
    id,
    kind: 'shorts',
    title: textValue(renderer?.overlayMetadata?.primaryText) || textValue(renderer?.title) || '춘봉TV Shorts',
    date: '',
    meta: textValue(renderer?.overlayMetadata?.secondaryText) || textValue(renderer?.viewCountText),
    thumb: bestThumb(renderer.thumbnail) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/shorts/${id}`,
    embed: `https://www.youtube.com/embed/${id}?rel=0`,
    platform: 'youtube'
  };
}

function collect(root, type) {
  const out = [], seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const candidates = type === 'videos'
      ? [node.videoRenderer, node.gridVideoRenderer]
      : [node.shortsLockupViewModel, node.reelItemRenderer];
    for (const candidate of candidates) {
      const item = type === 'videos' ? normalizeVideo(candidate) : normalizeShort(candidate);
      if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
    }
    if (out.length >= 24) return;
    if (Array.isArray(node)) node.forEach(walk);
    else Object.values(node).forEach(walk);
  };
  walk(root);
  return out.slice(0, 12);
}

async function fetchTab(type) {
  const html = await getText(`${CHANNEL}/${type}?hl=ko&gl=KR`);
  const data = extractInitialData(html);
  if (!data) return [];
  return collect(data, type);
}

module.exports = async function fetchYoutube() {
  const [videos, shorts] = await Promise.all([
    fetchTab('videos').catch(() => []),
    fetchTab('shorts').catch(() => [])
  ]);
  return { videos, shorts, items: [...videos, ...shorts] };
};
