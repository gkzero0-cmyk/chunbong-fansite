'use strict';

const Core = require('../chuntris-ranking-core.js');

const KEY_BY_MODE = Object.freeze({
  classic: 'chuntris:classic:players',
  sprint40: 'chuntris:sprint40:players',
  hard: 'chuntris:hard:players'
});

function setHeader(res, name, value) {
  if (typeof res.setHeader === 'function') res.setHeader(name, value);
}

function sendJson(res, statusCode, payload) {
  setHeader(res, 'Content-Type', 'application/json; charset=utf-8');
  if (typeof res.status === 'function' && typeof res.json === 'function') return res.status(statusCode).json(payload);
  res.statusCode = statusCode;
  if (typeof res.end === 'function') return res.end(JSON.stringify(payload));
  res.body = payload;
  return res;
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return { url, token };
}

async function redisCommand(command, ...args) {
  const env = redisEnv();
  const base = env.url.replace(/\/$/, '');
  const path = [command, ...args].map(value => encodeURIComponent(String(value))).join('/');
  const response = await fetch(`${base}/${path}`, { headers: { Authorization: `Bearer ${env.token}` } });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

function hasRedisEnv() {
  const env = redisEnv();
  return Boolean(env.url && env.token);
}

function parseMode(value) {
  return Object.prototype.hasOwnProperty.call(KEY_BY_MODE, value) ? value : null;
}

function parseBody(body) {
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string' && body.length <= 4096) {
    try { return JSON.parse(body); } catch { return null; }
  }
  return null;
}

function parseMap(raw) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function publicEntry(record, rank) {
  const entry = { rank, nickname: record.displayName, score: record.score, lines: record.lines, achievedAt: record.achievedAt };
  if (record.mode !== 'sprint40') entry.level = record.level;
  if (record.mode === 'sprint40') entry.timeMs = record.timeMs;
  return entry;
}

function topEntries(mode, map) {
  return Core.sortRecords(mode, Object.values(map)).slice(0, 10).map((record, index) => publicEntry(record, index + 1));
}

function header(req, name) {
  const headers = req?.headers || {};
  return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()] ?? '';
}

function requestHost(req) {
  return String(header(req, 'x-forwarded-host') || header(req, 'host') || '').split(',')[0].trim().toLowerCase();
}

function isAllowedOrigin(req) {
  const origin = String(header(req, 'origin') || '').trim();
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === requestHost(req);
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  const method = String(req?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    setHeader(res, 'Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  if (!hasRedisEnv()) return sendJson(res, 503, { error: 'ranking_unavailable' });

  try {
    if (method === 'GET') {
      const mode = parseMode(req?.query?.mode);
      if (!mode) return sendJson(res, 400, { error: 'invalid_mode' });
      setHeader(res, 'Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
      const map = parseMap(await redisCommand('GET', KEY_BY_MODE[mode]));
      return sendJson(res, 200, { mode, entries: topEntries(mode, map) });
    }

    setHeader(res, 'Cache-Control', 'no-store');
    const contentType = String(header(req, 'content-type')).toLowerCase();
    if (!contentType.includes('application/json')) return sendJson(res, 415, { error: 'json_required' });
    if (!isAllowedOrigin(req)) return sendJson(res, 403, { error: 'origin_not_allowed' });

    const body = parseBody(req?.body);
    if (!body) return sendJson(res, 400, { error: 'invalid_record' });
    const validation = Core.validateRecord(body);
    if (!validation.ok) return sendJson(res, 400, { error: validation.error });

    const record = validation.record;
    const mode = record.mode;
    const key = KEY_BY_MODE[mode];
    const map = parseMap(await redisCommand('GET', key));
    const current = map[record.key] || null;
    const candidate = { ...record, achievedAt: new Date().toISOString() };
    const updated = Core.isBetterRecord(mode, candidate, current);

    if (updated) {
      map[record.key] = candidate;
      await redisCommand('SET', key, JSON.stringify(map));
    }

    const personalBest = updated ? candidate : current;
    return sendJson(res, 200, {
      mode,
      updated,
      personalBest: personalBest ? publicEntry(personalBest, null) : null,
      entries: topEntries(mode, map)
    });
  } catch (error) {
    console.error('[chuntris-ranking] unavailable:', error?.message || 'unknown');
    return sendJson(res, 503, { error: 'ranking_unavailable' });
  }
};
