'use strict';

const DEFAULT_BROAD_URL = 'https://api-channel.sooplive.co.kr/v1.1/channel/chunbongtv/home/section/broad';
const DEFAULT_PLAYER_URL = 'https://live.sooplive.com/afreeca/player_live_api.php';
const DEFAULT_SOOP_ID = 'chunbongtv';
const DEFAULT_HEADERS = Object.freeze({
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
  accept: 'application/json,text/plain,*/*',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
});

function finite(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(normalized) ? normalized : null;
}

function stringValue(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function readAlias(root, aliases) {
  if (!root || typeof root !== 'object') return undefined;
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(root, key) && root[key] !== undefined && root[key] !== null && root[key] !== '') {
      return root[key];
    }
  }
  return undefined;
}

function looksLikeBroadcast(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  return readAlias(node, ['broad_no', 'broadNo', 'bno', 'broadNoStr', 'broadcastId']) !== undefined;
}

function firstBroadcast(payload) {
  const candidates = [
    payload,
    payload?.broad,
    payload?.data?.broad,
    payload?.data?.broadcast,
    payload?.data,
    payload?.items,
    payload?.broadcasts
  ];
  for (const candidate of candidates) {
    if (looksLikeBroadcast(candidate)) return candidate;
    if (Array.isArray(candidate)) {
      const found = candidate.find(looksLikeBroadcast);
      if (found) return found;
    }
  }
  return null;
}

function hasExplicitEmptyBroadcast(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(payload, 'broad') && (payload.broad === null || payload.broad === false)) return true;
  if (payload.data && typeof payload.data === 'object' && Object.prototype.hasOwnProperty.call(payload.data, 'broad') && (payload.data.broad === null || payload.data.broad === false)) return true;
  for (const value of [payload?.items, payload?.broadcasts, payload?.data?.broadcasts]) {
    if (Array.isArray(value) && value.length === 0) return true;
  }
  return false;
}

function emptyState(source = '') {
  return {
    live: null,
    authoritative: false,
    broadcastId: '',
    startedAt: '',
    title: '',
    viewerCount: null,
    categoryId: '',
    categoryName: '',
    source
  };
}

function normalizeSoopBroadPayload(payload = {}, source = 'soop-channel') {
  const broad = firstBroadcast(payload);
  if (broad) {
    return {
      ...emptyState(source),
      live: true,
      authoritative: true,
      broadcastId: stringValue(readAlias(broad, ['broad_no', 'broadNo', 'bno', 'broadNoStr', 'broadcastId'])),
      startedAt: stringValue(readAlias(broad, ['broad_start', 'broadStart', 'start_time', 'startTime', 'startedAt', 'startAt'])),
      title: stringValue(readAlias(broad, ['broad_title', 'broadTitle', 'title'])),
      viewerCount: finite(readAlias(broad, ['current_sum_viewer', 'currentSumViewer', 'total_view_cnt', 'viewer_count', 'viewerCount', 'view_cnt'])),
      categoryId: stringValue(readAlias(broad, ['broad_cate_no', 'broadCateNo', 'cate_no', 'cateNo', 'category_id', 'categoryId'])),
      categoryName: stringValue(readAlias(broad, ['cate_name', 'cateName', 'category_name', 'categoryName', 'category']))
    };
  }
  if (hasExplicitEmptyBroadcast(payload)) {
    return { ...emptyState(source), live: false, authoritative: true };
  }
  return emptyState(source);
}

function normalizeSoopPlayerPayload(payload = {}, source = 'soop-player') {
  const channel = payload?.CHANNEL && typeof payload.CHANNEL === 'object' ? payload.CHANNEL : payload?.channel && typeof payload.channel === 'object' ? payload.channel : payload;
  if (!channel || typeof channel !== 'object' || Array.isArray(channel)) return emptyState(source);
  const rawBno = readAlias(channel, ['BNO', 'bno', 'broad_no', 'broadNo', 'broadcastId']);
  const broadcastId = stringValue(rawBno);
  const numericBno = finite(rawBno);
  if (numericBno !== null && numericBno > 0) {
    return {
      ...emptyState(source),
      live: true,
      authoritative: true,
      broadcastId,
      startedAt: stringValue(readAlias(channel, ['BROAD_START', 'broad_start', 'start_time', 'startTime', 'startedAt'])),
      title: stringValue(readAlias(channel, ['TITLE', 'title', 'broad_title', 'broadTitle'])),
      viewerCount: finite(readAlias(channel, ['VIEWCNT', 'view_cnt', 'viewer_count', 'viewerCount', 'current_sum_viewer'])),
      categoryId: stringValue(readAlias(channel, ['CATE', 'CATE_NO', 'cate_no', 'categoryId'])),
      categoryName: stringValue(readAlias(channel, ['CATE_NAME', 'cate_name', 'categoryName']))
    };
  }
  if (Object.prototype.hasOwnProperty.call(channel, 'BNO') && (rawBno === null || rawBno === undefined || rawBno === '' || numericBno === 0)) {
    return { ...emptyState(source), live: false, authoritative: true };
  }
  return emptyState(source);
}

function decodeHtmlJsonString(value) {
  if (!value) return '';
  try { return JSON.parse('"' + String(value).replace(/"/g, '\\"') + '"'); } catch (_) { return String(value); }
}

function normalizeSoopPlayHtml(html = '', source = 'soop-play-page') {
  const text = String(html || '');
  const offline = /(?:스트리머가\s*오프라인입니다|streamer\s+is\s+offline)/i.test(text);
  if (offline) return { ...emptyState(source), live: false, authoritative: true };

  const bnoMatch = text.match(/(?:window\.)?nBroadNo\s*=\s*["']?(\d+)["']?/i)
    || text.match(/"(?:broad_no|broadNo|BNO)"\s*:\s*"?(\d+)"?/i);
  const broadcastId = bnoMatch ? String(bnoMatch[1]) : '';
  const titleMatch = text.match(/"(?:broad_title|broadTitle|TITLE)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const startMatch = text.match(/"(?:broad_start|broadStart|BROAD_START|start_time|startTime)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const viewerMatch = text.match(/"(?:current_sum_viewer|total_view_cnt|viewer_count|viewerCount|view_cnt|VIEWCNT)"\s*:\s*"?([\d,]+)"?/i);
  const categoryIdMatch = text.match(/"(?:broad_cate_no|broadCateNo|cate_no|CATE_NO|categoryId)"\s*:\s*"?([^",}]+)"?/i);
  const categoryNameMatch = text.match(/"(?:cate_name|cateName|CATE_NAME|categoryName)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);

  if (broadcastId && Number(broadcastId) > 0) {
    return {
      ...emptyState(source),
      live: true,
      authoritative: true,
      broadcastId,
      startedAt: startMatch ? decodeHtmlJsonString(startMatch[1]) : '',
      title: titleMatch ? decodeHtmlJsonString(titleMatch[1]) : '',
      viewerCount: viewerMatch ? finite(viewerMatch[1]) : null,
      categoryId: categoryIdMatch ? stringValue(categoryIdMatch[1]) : '',
      categoryName: categoryNameMatch ? decodeHtmlJsonString(categoryNameMatch[1]) : ''
    };
  }

  return emptyState(source);
}

async function fetchSoopPlayerLive(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const soopId = options.soopId || DEFAULT_SOOP_ID;
  const url = options.playerUrl || DEFAULT_PLAYER_URL;
  const body = new URLSearchParams({
    bid: soopId,
    bno: 'null',
    type: 'live',
    pwd: '',
    player_type: 'html5',
    stream_type: 'common',
    quality: 'HD',
    mode: 'landing',
    from_api: '0',
    is_revive: 'false'
  });
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': 'application/x-www-form-urlencoded',
      referer: `https://www.sooplive.com/station/${soopId}`
    },
    body,
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(7000) : undefined
  });
  if (!response.ok) throw new Error(`SOOP player live ${response.status}`);
  return normalizeSoopPlayerPayload(await response.json(), 'soop-player');
}

function resolveLiveState(signals = []) {
  const rows = (Array.isArray(signals) ? signals : []).filter(Boolean);
  const live = rows.find(row => row.live === true);
  if (live) return { ...emptyState(live.source || ''), ...live, live: true };
  const offline = rows.find(row => row.live === false && row.authoritative === true);
  if (offline) return { ...emptyState(offline.source || ''), ...offline, live: false };
  return emptyState(rows.find(row => row?.source)?.source || '');
}

async function fetchSoopStructuredLive(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const url = options.url || DEFAULT_BROAD_URL;
  let primaryState = emptyState('soop-channel');
  let primaryError = null;
  try {
    const response = await fetchImpl(url, {
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(7000) : undefined
    });
    if (!response.ok) throw new Error(`SOOP structured live ${response.status}`);
    primaryState = normalizeSoopBroadPayload(await response.json(), 'soop-channel');
    if (primaryState.authoritative) return primaryState;
  } catch (error) {
    primaryError = error;
  }

  try {
    const fallbackState = await fetchSoopPlayerLive({ ...options, fetchImpl });
    if (fallbackState.authoritative) return fallbackState;
    if (!primaryError) return resolveLiveState([primaryState, fallbackState]);
  } catch (fallbackError) {
    if (!primaryError) return primaryState;
    throw new Error(`${primaryError.message}; ${fallbackError.message}`);
  }

  if (primaryError) throw primaryError;
  return primaryState;
}

module.exports = {
  DEFAULT_BROAD_URL,
  DEFAULT_PLAYER_URL,
  normalizeSoopBroadPayload,
  normalizeSoopPlayerPayload,
  normalizeSoopPlayHtml,
  resolveLiveState,
  fetchSoopPlayerLive,
  fetchSoopStructuredLive
};
