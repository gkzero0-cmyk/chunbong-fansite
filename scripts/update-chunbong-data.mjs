import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'chunbong-data-history.json');
const DEFAULT_URL = 'https://chunbong-fansite.vercel.app/api/content?type=data';

function kstDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function upsertSnapshot(history, snapshot, limit = 400) {
  const source = history && typeof history === 'object' ? history : {};
  const byDate = new Map();
  for (const item of Array.isArray(source.snapshots) ? source.snapshots : []) {
    if (item?.date) byDate.set(String(item.date), item);
  }
  if (snapshot?.date) byDate.set(String(snapshot.date), snapshot);
  const snapshots = [...byDate.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-Math.max(1, limit));
  return { version: Number(source.version) || 1, snapshots };
}

export function buildSnapshot(payload, now = new Date()) {
  const capturedAt = payload?.capturedAt || now.toISOString();
  return {
    date: kstDateKey(now),
    capturedAt,
    soop: {
      live: payload?.soop?.live?.live ?? null,
      monthlyVodCount: payload?.soop?.monthly?.vodCount ?? null,
      monthlyVodMinutes: payload?.soop?.monthly?.vodMinutes ?? null,
      monthlyCatchCount: payload?.soop?.monthly?.catchCount ?? null,
      monthlyClipCount: payload?.soop?.monthly?.clipCount ?? null
    },
    youtube: {
      subscriberCount: payload?.youtube?.channel?.subscriberCount ?? null,
      viewCount: payload?.youtube?.channel?.viewCount ?? null,
      videoCount: payload?.youtube?.channel?.videoCount ?? null,
      recentUploadCount: payload?.youtube?.monthly?.uploadCount ?? null
    }
  };
}

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch (_) {
    return { version: 1, snapshots: [] };
  }
}

async function main() {
  const url = process.env.CHUNBONG_DATA_URL || DEFAULT_URL;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`data endpoint ${response.status}`);
  const payload = await response.json();
  if (!payload || payload.fallback) throw new Error(`data endpoint fallback: ${payload?.reason || 'unknown'}`);
  const history = readHistory();
  const snapshot = buildSnapshot(payload, new Date());
  const next = upsertSnapshot(history, snapshot);
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`CHUNBONG_DATA_SNAPSHOT=${snapshot.date}`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
