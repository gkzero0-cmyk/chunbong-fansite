from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    return text.replace(old, new, 1)


path = ROOT / 'lib' / 'chunbong-data.js'
text = path.read_text()
text = replace_once(
    text,
    "const { fetchExternalSoopStats, mergeExternalSessions, mergeSoopMetricSources, extractExternalSoopStatsFromHtml } = require('./soop-external');",
    "const { fetchExternalSoopStats, mergeExternalSessions, mergeSoopMetricSources, extractExternalSoopStatsFromHtml } = require('./soop-external');\nconst { fetchSoopStructuredLive, resolveLiveState } = require('./soop-live-state');",
    'live resolver import'
)

new_live = r'''async function fetchSoopLive() {
  let structuredSignal = null;
  try {
    structuredSignal = await fetchSoopStructuredLive({ headers: { 'user-agent': HTML_HEADERS['user-agent'] } });
  } catch (_) {}

  let htmlSignal = null;
  let metrics = { categoryId: '', categoryName: '', followerCount: null, fanclubCount: null };
  try {
    const response = await fetch(`https://play.sooplive.com/${SOOP_ID}`, { headers: HTML_HEADERS });
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/"(?:broad_title|broadTitle)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const viewerMatch = html.match(/"(?:total_view_cnt|viewer_count|viewerCount|view_cnt)"\s*:\s*"?(\d+)"?/i);
      const startMatch = html.match(/"(?:broad_start|broadStart|start_time|startTime)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      metrics = extractSoopPublicMetricsFromHtml(html);
      const hasLiveMetadata = Boolean(titleMatch || startMatch);
      htmlSignal = {
        live: hasLiveMetadata ? true : /스트리머가\s*오프라인입니다/.test(html) ? false : null,
        authoritative: false,
        broadcastId: '',
        title: titleMatch ? decodeJsonString(titleMatch[1]) : '',
        startedAt: startMatch ? decodeJsonString(startMatch[1]) : '',
        viewerCount: viewerMatch ? Number(viewerMatch[1]) : null,
        categoryId: metrics.categoryId,
        categoryName: metrics.categoryName,
        source: `https://play.sooplive.com/${SOOP_ID}`
      };
    }
  } catch (_) {}

  const resolved = resolveLiveState([structuredSignal, htmlSignal]);
  const live = resolved.live === true;
  return {
    ...resolved,
    title: live ? (resolved.title || htmlSignal?.title || '') : '',
    startedAt: live ? (resolved.startedAt || htmlSignal?.startedAt || '') : '',
    viewerCount: live ? (resolved.viewerCount ?? htmlSignal?.viewerCount ?? null) : null,
    categoryId: live ? (resolved.categoryId || htmlSignal?.categoryId || '') : '',
    categoryName: live ? (resolved.categoryName || htmlSignal?.categoryName || '') : '',
    followerCount: metrics.followerCount,
    fanclubCount: metrics.fanclubCount,
    source: resolved.source || htmlSignal?.source || `https://play.sooplive.com/${SOOP_ID}`
  };
}'''
pattern = re.compile(r"async function fetchSoopLive\(\) \{.*?\n\}\n\nasync function fetchSoopChannelProfile", re.S)
if new_live not in text:
    replacement = new_live + "\n\nasync function fetchSoopChannelProfile"
    text, count = pattern.subn(lambda _match: replacement, text, count=1)
    if count != 1:
        raise SystemExit('missing patch anchor: fetchSoopLive body')

text = replace_once(
    text,
    "module.exports.fetchSoopLive = fetchSoopLive;",
    "module.exports.fetchSoopLive = fetchSoopLive;\nmodule.exports.fetchSoopStructuredLive = fetchSoopStructuredLive;",
    'structured live export'
)
path.write_text(text)
print('APPLIED_TASK1_LIVE_PATCH=1')
