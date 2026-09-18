'use strict';

const fetchNotice = require('./notice');
const fetchVod = require('./vod');
const fetchClips = require('./clips');
const fetchFanart = require('./fanart');
const fetchYoutube = require('./youtube');
const { buildActivityFeed } = require('../lib/activity-feed');

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
