'use strict';

const fetchNotice = require('../api/notice');
const fetchVod = require('../api/vod');
const fetchClips = require('../api/clips');
const fetchFanart = require('../api/fanart');
const fetchYoutube = require('../api/youtube');
const fetchSchedule = require('../api/schedule');
const { buildActivityFeed } = require('./activity-feed');

async function settled(label, task) {
  try {
    return { label, value: await task(), error: '' };
  } catch (error) {
    return { label, value: label === 'clips' || label === 'youtube' ? {} : [], error: error && error.message ? error.message : String(error) };
  }
}

function scheduleTime(value = '') {
  const text = String(value || '').trim();
  if (!text) return NaN;
  const normalized = /^20\d{2}-\d{2}-\d{2}$/.test(text) ? text + 'T00:00:00+09:00' : text;
  return Date.parse(normalized);
}

function selectActivitySchedule(items = [], now = new Date()) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const day = 86400000;
  const rows = (Array.isArray(items) ? items : [])
    .map(item => ({ item, time: scheduleTime(item?.start) }))
    .filter(row => Number.isFinite(row.time))
    .sort((a, b) => a.time - b.time);
  const recent = rows.filter(row => row.time <= nowMs && row.time >= nowMs - 7 * day).slice(-4);
  const upcoming = rows.filter(row => row.time > nowMs && row.time <= nowMs + 30 * day).slice(0, 4);
  return [...recent, ...upcoming].map(row => row.item);
}

module.exports = async function fetchActivity() {
  const rows = await Promise.all([
    settled('notice', fetchNotice),
    settled('vod', fetchVod),
    settled('clips', fetchClips),
    settled('fanart', fetchFanart),
    settled('youtube', fetchYoutube),
    settled('schedule', fetchSchedule)
  ]);
  const sources = Object.fromEntries(rows.map(row => [row.label, row.value]));
  sources.schedule = selectActivitySchedule(sources.schedule, new Date());
  const errors = rows.filter(row => row.error).map(row => ({ source: row.label, message: row.error }));
  return {
    items: buildActivityFeed(sources, { limit: 48 }),
    errors,
    capturedAt: new Date().toISOString()
  };
};

module.exports.selectActivitySchedule = selectActivitySchedule;
module.exports.scheduleTime = scheduleTime;
