import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  collectBrowsePage,
  extractInnertubeConfig,
  extractWatchMetricsFromHtml,
  findCommentsContinuation,
  extractCommentPage
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
assert.equal(page.items[0].viewCount, 1200, 'browse view count should be preserved as a public fallback metric');
assert.equal(page.items[1].viewCount, 3400, 'shorts browse view count should be preserved as a public fallback metric');
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

// Current public watch HTML can return a LOGIN_REQUIRED player object while ytInitialData
// still contains the target video's public view count and exact date.
const currentWatchHtml = `
<script>
var ytInitialPlayerResponse = {"playabilityStatus":{"status":"LOGIN_REQUIRED"}};
var ytInitialData = {
  "contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[
    {"videoPrimaryInfoRenderer":{
      "viewCount":{"videoViewCountRenderer":{"viewCount":{"simpleText":"조회수 80회"},"shortViewCount":{"simpleText":"조회수 80회"}}},
      "dateText":{"simpleText":"2026. 8. 7."}
    }},
    {"itemSectionRenderer":{"sectionIdentifier":"comment-item-section","contents":[
      {"continuationItemRenderer":{"continuationEndpoint":{"continuationCommand":{"token":"COMMENTS_ROOT"}}}}
    ]}}
  ]}}}}
};
</script>`;
const currentMetrics = extractWatchMetricsFromHtml(currentWatchHtml);
assert.equal(currentMetrics.viewCount, 80, 'ytInitialData public view count should be used when player videoDetails is unavailable');
assert.equal(currentMetrics.publishedAt, '2026-08-07T00:00:00.000Z', 'exact public dateText should be normalized');
assert.equal(currentMetrics.commentCount, null);
assert.equal(findCommentsContinuation(currentWatchHtml), 'COMMENTS_ROOT');

const commentPageOne = {
  onResponseReceivedEndpoints: [{
    reloadContinuationItemsCommand: {
      targetId: 'comments-section',
      continuationItems: [
        { commentThreadRenderer: { comment: { commentRenderer: { commentId: 'c1' } } } },
        { commentThreadRenderer: { comment: { commentRenderer: { commentId: 'c2' } } } },
        { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'COMMENTS_PAGE_2' } } } }
      ]
    }
  }]
};
const commentPageTwo = {
  onResponseReceivedEndpoints: [{
    appendContinuationItemsAction: {
      targetId: 'comments-section',
      continuationItems: [
        { commentThreadRenderer: { comment: { commentRenderer: { commentId: 'c3' } } } }
      ]
    }
  }]
};
assert.deepEqual(extractCommentPage(commentPageOne), { count: 2, nextToken: 'COMMENTS_PAGE_2' });
assert.deepEqual(extractCommentPage(commentPageTwo), { count: 1, nextToken: '' });

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