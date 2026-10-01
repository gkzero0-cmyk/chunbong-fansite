'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const guideSources = require('../lib/content-guide-sources.js');

test('survival guide hydration prefers the proven transport endpoint before the public wiki asset path', async () => {
  const previousFetch = global.fetch;
  const calls = [];
  const payload = {
    generatedAt: '2026-10-01T00:00:00.000Z',
    pages: [{ pageId: 'story', title: '스토리', sections: [{ heading: '시작', text: '공식 위키 본문' }] }]
  };
  global.fetch = async url => {
    calls.push(String(url));
    if (String(url) === guideSources.officialWikiTransportUrl()) {
      return { ok: true, json: async () => payload };
    }
    throw new Error('public wiki asset path should not be attempted before the transport endpoint');
  };
  try {
    const result = await guideSources.fetchOfficialWikiIndex(guideSources.SURVIVAL_WIKI_SOURCE, { timeoutMs: 50 });
    assert.equal(calls[0], guideSources.officialWikiTransportUrl());
    assert.equal(result.transportUrl, guideSources.officialWikiTransportUrl());
    const rows = guideSources.officialWikiGuideRows(result.payload, guideSources.SURVIVAL_WIKI_SOURCE);
    assert.ok(rows.length > 0);
    assert.match(rows[0].text, /공식 위키 본문/);
  } finally {
    global.fetch = previousFetch;
  }
});
