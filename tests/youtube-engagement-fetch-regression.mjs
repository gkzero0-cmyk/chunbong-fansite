import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  collectBrowsePage,
  extractInnertubeConfig,
  extractWatchMetricsFromHtml
} = require('../api/youtube');

const browse = {
  contents: [
    {
      videoRenderer: {
        videoId: 'video000001',
        title: { simpleText: 'Video One' },
        publishedTimeText: { simpleText: '2026. 9. 1.' },
        viewCountText: { simpleText: '조회수 1,200회' },
        thumbnail: { thumbnails: [{ url: 'video-thumb' }] }
      }
    },
    {
      shortsLockupViewModel: {
        onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: 'short000001' } } },
        overlayMetadata: {
          primaryText: { content: 'Short One' },
          secondaryText: { content: '조회수 3,400회' }
        },
        metadata: {
          lockupMetadataViewModel: {
            metadata: {
              contentMetadataViewModel: {
                metadataRows: [{ metadataParts: [{ text: { content: '2026. 9. 2.' } }] }]
              }
            }
          }
        },
        thumbnail: { thumbnails: [{ url: 'short-thumb' }] }
      }
    },
    {
      videoRenderer: {
        videoId: 'video000001',
        title: { simpleText: 'Duplicate Video One' }
      }
    },
    {
      continuationItemRenderer: {
        continuationEndpoint: {
          continuationCommand: { token: 'NEXT_TOKEN' }
        }
      }
    }
  ]
};

const page = collectBrowsePage(browse);
assert.deepEqual(page.items.map(item => item.id), ['video000001', 'short000001']);
assert.equal(page.items[0].kind, 'videos');
assert.equal(page.items[1].kind, 'shorts');
assert.equal(page.nextToken, 'NEXT_TOKEN');

const html = `
<script>
ytcfg.set({"INNERTUBE_API_KEY":"TEST_KEY","INNERTUBE_CLIENT_VERSION":"2.20260904.00.00","INNERTUBE_CONTEXT_CLIENT_NAME":1});
var ytInitialPlayerResponse = {"videoDetails":{"videoId":"video000001","viewCount":"12345"},"microformat":{"playerMicroformatRenderer":{"publishDate":"2026-08-05","uploadDate":"2026-08-05"}}};
var ytInitialData = {"contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[{"commentsEntryPointHeaderRenderer":{"commentCount":{"simpleText":"댓글 321개"}}}]}}}}};
</script>`;

const config = extractInnertubeConfig(html);
assert.equal(config.apiKey, 'TEST_KEY');
assert.equal(config.clientVersion, '2.20260904.00.00');
assert.equal(config.clientName, 1);

const metrics = extractWatchMetricsFromHtml(html);
assert.equal(metrics.viewCount, 12345);
assert.equal(metrics.commentCount, 321);
assert.equal(metrics.publishedAt, '2026-08-05T00:00:00.000Z');

const noCommentsHtml = `
<script>
var ytInitialPlayerResponse = {"videoDetails":{"videoId":"short000001","viewCount":"777"},"microformat":{"playerMicroformatRenderer":{"publishDate":"2026-09-02"}}};
var ytInitialData = {"contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[]}}}}};
</script>`;
const noComments = extractWatchMetricsFromHtml(noCommentsHtml);
assert.equal(noComments.viewCount, 777);
assert.equal(noComments.commentCount, null, 'disabled or unavailable comments must stay null');
assert.equal(noComments.publishedAt, '2026-09-02T00:00:00.000Z');

console.log('YouTube engagement fetch regression test passed');