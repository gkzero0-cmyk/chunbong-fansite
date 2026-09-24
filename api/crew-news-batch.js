'use strict';

function safeStations(raw = '') {
  const seen = new Set();
  const stations = [];
  for (const value of String(raw || '').split(',')) {
    const station = value.trim();
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(station) || seen.has(station)) continue;
    seen.add(station);
    stations.push(station);
    if (stations.length >= 20) break;
  }
  return stations;
}

function intParam(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      results[current] = await mapper(items[current]);
    }
  }));
  return results;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const requestUrl = new URL(req.url || '/', 'https://chunbong.local');
  const stations = safeStations(requestUrl.searchParams.get('stations') || '');
  if (!stations.length) return res.status(400).json({ error: 'invalid_stations' });

  const perPage = intParam(requestUrl.searchParams.get('per_page'), 30, 1, 50);
  const keyword = String(requestUrl.searchParams.get('keyword') || '').trim().slice(0, 120);
  const startDate = String(requestUrl.searchParams.get('start_date') || '').trim().slice(0, 32);
  const endDate = String(requestUrl.searchParams.get('end_date') || '').trim().slice(0, 32);

  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'chunbong-fansite.vercel.app').split(',')[0].trim();
  const base = proto + '://' + host;

  const results = await mapLimit(stations, 5, async station => {
    const params = new URLSearchParams({
      station,
      per_page: String(perPage),
      keyword,
      start_date: startDate,
      end_date: endDate
    });
    const url = base + '/api/crew-news?' + params.toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChunbongCrewSheet/1.0'
        }
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || body.ok !== true) {
        return {
          station,
          ok: false,
          status: response.status,
          error: body && body.error ? body.error : 'crew_news_failed'
        };
      }
      return {
        station,
        ok: true,
        authenticated: Boolean(body.authenticated),
        count: Number(body.count || 0),
        posts: Array.isArray(body.posts) ? body.posts : []
      };
    } catch (error) {
      return {
        station,
        ok: false,
        status: 0,
        error: error && error.name === 'AbortError' ? 'timeout' : String(error && error.message || error)
      };
    } finally {
      clearTimeout(timer);
    }
  });

  const failures = results.filter(item => !item.ok);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(failures.length === results.length ? 502 : 200).json({
    ok: failures.length < results.length,
    complete: failures.length === 0,
    keyword,
    requested: stations.length,
    succeeded: results.length - failures.length,
    failed: failures.length,
    results
  });
};

module.exports._internals = { safeStations, intParam };
