const { SOOP_ID, normalizeVideo, getJson, listFrom } = require('./_shared');

const URLS = {
  catch: [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/catch?page=1&perPage=24&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/catch?page=1&per_page=24&orderby=reg_date`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/catch/all?page=1&per_page=24&orderby=reg_date`
  ],
  clip: [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/clip?page=1&perPage=12&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/clip/all?page=1&per_page=12&orderby=reg_date`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/clip?page=1&per_page=12&orderby=reg_date`
  ]
};

function sortNewest(a, b) {
  const dateCompare = String(b.sortDate || b.date || '').localeCompare(String(a.sortDate || a.date || ''));
  if (dateCompare) return dateCompare;
  const aId = Number(a.id || 0);
  const bId = Number(b.id || 0);
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return bId - aId;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function finalizeCatch(items) {
  const byId = new Map();
  for (const item of items) {
    if (!item?.id || item.kind !== 'catch') continue;
    const current = byId.get(item.id);
    if (!current || sortNewest(item, current) < 0) byId.set(item.id, item);
  }
  return [...byId.values()].sort(sortNewest).slice(0, 12);
}

async function fetchClipGroup(kind) {
  if (kind === 'catch') {
    const results = await Promise.all(URLS.catch.map(async url => {
      try {
        return listFrom(await getJson(url)).map(item => normalizeVideo(item, 'catch')).filter(Boolean);
      } catch (_) {
        return [];
      }
    }));
    return finalizeCatch(results.flat());
  }

  for (const url of URLS.clip) {
    try {
      const raw = listFrom(await getJson(url));
      if (!raw.length) continue;
      return raw.map(item => normalizeVideo(item, 'clip')).filter(Boolean).slice(0, 12);
    } catch (_) {}
  }
  return [];
}

module.exports = async function fetchClips() {
  const [catchItems, clipItems] = await Promise.all([fetchClipGroup('catch'), fetchClipGroup('clip')]);
  return { catch: catchItems, clip: clipItems, items: [...catchItems, ...clipItems] };
};

module.exports.finalizeCatch = finalizeCatch;
