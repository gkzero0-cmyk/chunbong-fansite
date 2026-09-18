'use strict';

const fetchNotice = require('../api/notice');
const fetchVod = require('../api/vod');
const fetchClips = require('../api/clips');
const fetchFanart = require('../api/fanart');
const fetchYoutube = require('../api/youtube');
const { buildActivityFeed } = require('./activity-feed');

async function settled(label, task) {
  try {
    return { label, value: await task(), error: '' };
  } catch (error) {
    return { label, value: label === 'clips' || label === 'youtube' ? {} : [], error: error && error.message ? error.message : String(error) };
  }
}

module.exports = async function fetchActivity() {
  const rows = await Promise.all([
    settled('notice', fetchNotice),
    settled('vod', fetchVod),
    settled('clips', fetchClips),
    settled('fanart', fetchFanart),
    settled('youtube', fetchYoutube)
  ]);
  const sources = Object.fromEntries(rows.map(row => [row.label, row.value]));
  const errors = rows.filter(row => row.error).map(row => ({ source: row.label, message: row.error }));
  return {
    items: buildActivityFeed(sources, { limit: 48 }),
    errors,
    capturedAt: new Date().toISOString()
  };
};
