'use strict';

const DEFAULT_BROAD_URL = 'https://api-channel.sooplive.co.kr/v1.1/channel/chunbongtv/home/section/broad';
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
  const response = await fetchImpl(url, {
    headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(7000) : undefined
  });
  if (!response.ok) throw new Error(`SOOP structured live ${response.status}`);
  return normalizeSoopBroadPayload(await response.json(), 'soop-channel');
}

module.exports = {
  DEFAULT_BROAD_URL,
  normalizeSoopBroadPayload,
  resolveLiveState,
  fetchSoopStructuredLive
};
