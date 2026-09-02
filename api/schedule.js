const NOTION_PAGE_ID = '2c059c07-cee4-8093-8952-ffaf573b8c99';
const NOTION_SOURCE = 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99?pvs=74';
const NOTION_API = 'https://www.notion.so/api/v3';
const notionHeaders = {
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  accept: 'application/json,text/plain,*/*',
  referer: NOTION_SOURCE,
};

async function postNotion(endpoint, body) {
  const response = await fetch(`${NOTION_API}/${endpoint}`, {
    method: 'POST', headers: notionHeaders, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`notion ${endpoint} ${response.status}`);
  return response.json();
}

function recordValue(entry) {
  let current = entry || null;
  while (current && typeof current === 'object' && current.value && typeof current.value === 'object') {
    if (current.id || current.type || current.schema || current.query || current.query2) break;
    current = current.value;
  }
  return current || null;
}
function findCollection(recordMap = {}) {
  const blocks = recordMap.block || {};
  for (const entry of Object.values(blocks)) {
    const block = recordValue(entry);
    if (!block || !['collection_view','collection_view_page'].includes(block.type)) continue;
    const collectionId = block.collection_id;
    const viewId = Array.isArray(block.view_ids) ? block.view_ids[0] : '';
    if (collectionId && viewId) return { collectionId, viewId };
  }
  return null;
}

function walk(value, visit, seen = new Set()) {
  if (value === null || value === undefined) return;
  if (typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);
    visit(value);
    for (const child of (Array.isArray(value) ? value : Object.values(value))) walk(child, visit, seen);
  }
}

function findDate(value) {
  let found = null;
  walk(value, object => {
    if (found || Array.isArray(object)) return;
    if (object.type === 'date' || object.start_date || object.startDate) {
      const startDate = object.start_date || object.startDate;
      if (startDate) found = object;
    }
  });
  return found;
}

function plainText(value) {
  const out = [];
  const seen = new Set();
  function visit(node) {
    if (node === null || node === undefined || node === false) return;
    if (typeof node === 'string') {
      if (!['‣','d'].includes(node) && !/^https?:\/\//i.test(node)) out.push(node);
      return;
    }
    if (typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    for (const child of (Array.isArray(node) ? node : Object.values(node))) visit(child);
  }
  visit(value);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function propertyIdByType(schema, type, names = []) {
  for (const [id, meta] of Object.entries(schema || {})) {
    if (meta?.type === type) return id;
    if (names.includes(meta?.name)) return id;
  }
  return '';
}

function toKstIso(date, time) {
  if (!date) return '';
  if (!time) return String(date).slice(0, 10);
  const normalized = /^\d{2}:\d{2}$/.test(String(time)) ? `${time}:00` : String(time);
  return `${String(date).slice(0,10)}T${normalized}+09:00`;
}

function parseRows(recordMap = {}, collectionId, schema = {}) {
  const titleId = propertyIdByType(schema, 'title', ['이름','Name','제목']);
  const dateId = propertyIdByType(schema, 'date', ['날짜','Date']);
  const tagId = propertyIdByType(schema, 'multi_select', ['태그','Tags','Tag']);
  const rows = [];
  for (const entry of Object.values(recordMap.block || {})) {
    const row = recordValue(entry);
    if (!row || row.type !== 'page' || !row.properties) continue;
    if (row.parent_id && collectionId && row.parent_id !== collectionId && row.parent_table !== 'collection') continue;
    const title = plainText(row.properties[titleId] || row.properties.title || row.properties.Name);
    const dateObj = findDate(row.properties[dateId] || row.properties.date || row.properties.Date);
    if (!title || !dateObj) continue;
    const startDate = dateObj.start_date || dateObj.startDate;
    const endDate = dateObj.end_date || dateObj.endDate || '';
    const startTime = dateObj.start_time || dateObj.startTime || '';
    const endTime = dateObj.end_time || dateObj.endTime || '';
    const tagText = plainText(row.properties[tagId] || row.properties.tag || row.properties.Tags || '');
    const tags = tagText.split(/[,，]/).map(x => x.trim()).filter(Boolean);
    rows.push({
      title,
      tags,
      start: toKstIso(startDate, startTime),
      end: endDate ? toKstIso(endDate, endTime) : '',
      isDateTime: Boolean(startTime),
      link: `${NOTION_SOURCE.split('?')[0]}?p=${String(row.id || '').replace(/-/g,'')}`,
    });
  }
  return rows.sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

module.exports = async function fetchSchedule() {
  const page = await postNotion('loadPageChunk', {
    pageId: NOTION_PAGE_ID, limit: 100, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false
  });
  const ref = findCollection(page.recordMap || {});
  if (!ref) throw new Error('Notion calendar collection not found');
  const collection = recordValue(page.recordMap?.collection?.[ref.collectionId]) || {};
  const view = recordValue(page.recordMap?.collection_view?.[ref.viewId]) || {};
  const collectionData = await postNotion('queryCollection', {
    collectionId: ref.collectionId,
    collectionViewId: ref.viewId,
    query: view.query2 || view.query || { aggregations: [] },
    loader: {
      type: ['table','board'].includes(view.type) ? view.type : 'table',
      limit: 100,
      searchQuery: '',
      userTimeZone: 'Asia/Seoul',
      userLocale: 'ko',
      loadContentCover: true,
    }
  });
  return parseRows(collectionData.recordMap || {}, ref.collectionId, collection.schema || {}).slice(0, 100);
};

module.exports.parseRows = parseRows;
module.exports.findCollection = findCollection;
module.exports.findDate = findDate;
