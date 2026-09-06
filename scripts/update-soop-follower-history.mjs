import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const {
  extractTrackifyFollowerPoints,
  snapshotsToFollowerPoints,
  mergeFollowerHistory
} = require('../lib/soop-follower-history.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'soop-follower-history.json');
const SNAPSHOT_PATH = path.join(DATA_DIR, 'chunbong-data-history.json');
const TREND_URL = 'https://www.trackify.kr/api/v1/p/soop/streamer/chunbongtv/trend';
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
  accept: 'application/json',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

function kstMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' })
    .formatToParts(now).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}`;
}

export function monthRange(start = '2025-09', end = kstMonthKey()) {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const rows = [];
  let year = startYear, month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    rows.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  return rows;
}

export function monthBounds(month) {
  const [year, number] = String(month).split('-').map(Number);
  const nextYear = number === 12 ? year + 1 : year;
  const nextMonth = number === 12 ? 1 : number + 1;
  return {
    from: `${year}-${String(number).padStart(2, '0')}-01`,
    to: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  };
}

async function fetchMonth(month, fetchImpl = fetch) {
  const { from, to } = monthBounds(month);
  const url = new URL(TREND_URL);
  url.searchParams.set('metrics', 'favorite,fanclub');
  url.searchParams.set('granularity', 'day');
  url.searchParams.set('count', '62');
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  const response = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${url.href} ${response.status}`);
  return response.json();
}

export async function collectTrackifyFollowerPoints(options = {}) {
  const months = options.months || monthRange('2025-09', kstMonthKey(options.now || new Date()));
  const fetchImpl = options.fetchImpl || fetch;
  const capturedAt = (options.now || new Date()).toISOString();
  const points = [];
  const errors = [];
  for (const month of months) {
    try {
      const payload = await fetchMonth(month, fetchImpl);
      points.push(...extractTrackifyFollowerPoints(payload, capturedAt));
    } catch (error) {
      errors.push({ month, message: error?.message || String(error) });
    }
  }
  return { points: mergeFollowerHistory(points), errors };
}

async function main() {
  const previous = readJson(HISTORY_PATH, { version: 1, points: [] });
  const snapshots = readJson(SNAPSHOT_PATH, { version: 1, snapshots: [] });
  const direct = snapshotsToFollowerPoints(snapshots);
  const collected = await collectTrackifyFollowerPoints();
  const points = mergeFollowerHistory(previous, collected.points, direct);
  const next = { version: Number(previous?.version) || 1, points };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`SOOP_FOLLOWER_HISTORY_POINTS=${points.length}`);
  console.log(`SOOP_FOLLOWER_HISTORY_TRACKIFY_POINTS=${collected.points.length}`);
  console.log(`SOOP_FANCLUB_HISTORY_POINTS=${points.filter(point => Number.isFinite(point?.fanclubCount)).length}`);
  console.log(`SOOP_FOLLOWER_HISTORY_FETCH_ERRORS=${collected.errors.length}`);
  if (collected.errors.length) console.log(`SOOP_FOLLOWER_HISTORY_FAILED_MONTHS=${collected.errors.map(error => error.month).join(',')}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
