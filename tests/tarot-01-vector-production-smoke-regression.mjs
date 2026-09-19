import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync(new URL('../.github/workflows/tarot-production-smoke.yml', import.meta.url), 'utf8');
const cloudinaryBase = 'https://res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/tarot-original';

assert.ok(workflow.includes("- 'tarot-composite.js'"), 'production smoke must trigger when the vector composite renderer changes');
assert.ok(workflow.includes("- 'tarot-composite.css'"), 'production smoke must trigger when the vector composite styles change');
assert.ok(workflow.includes('COMPOSITE_JS_HTTP='), 'production readiness polling must fetch tarot-composite.js');
assert.ok(workflow.includes('COMPOSITE_CSS_HTTP='), 'production readiness polling must fetch tarot-composite.css');
assert.ok(workflow.includes('ORIGINAL_ASSET_HTTP='), 'production readiness polling must still verify the uploaded source sheet');
assert.ok(workflow.includes(`ORIGINAL_BASE='${cloudinaryBase}'`), 'production smoke must pin the Cloudinary original-art base URL');
assert.ok(workflow.includes('$ORIGINAL_BASE/sheet-0.avif'), 'source health check must verify the first Cloudinary original sheet');
assert.ok(workflow.includes('$ORIGINAL_BASE/sheet-5.avif'), 'source health check must verify the last Cloudinary original sheet');
assert.ok(workflow.includes('CARD0_HTTP='), 'production readiness must fetch an individual first-card crop');
assert.ok(workflow.includes('CARD77_HTTP='), 'production readiness must fetch an individual last-card crop');
assert.ok(workflow.includes('c_crop,g_north_west,h_1488,w_898,x_0,y_0'), 'first card must be cropped at exact native geometry');
assert.ok(workflow.includes('c_crop,g_north_west,h_1488,w_898,x_10776,y_0'), 'last card crop must address the exact source slot');
assert.ok(workflow.includes('q_100/f_avif'), 'card crop delivery must use maximum Cloudinary quality');
assert.ok(workflow.includes('size.width !== 898 || size.height !== 1488'), 'production must verify native single-card dimensions');
assert.ok(!workflow.includes("- 'assets/tarot/original/**'"), 'Cloudinary-backed originals must not pretend to be repository binary assets');
assert.ok(workflow.includes("grep -q 'tarot-composite.js' /tmp/tarot-page"), 'production page must prove the composite renderer is loaded');
assert.ok(workflow.includes("grep -q 'originalArtworkDescriptor' /tmp/tarot-composite-js"), 'production JS must prove uploaded-original mapping is deployed');
assert.ok(workflow.includes("grep -q 'originalCardCropUrl' /tmp/tarot-composite-js"), 'production JS must prove individual-card crop mapping is deployed');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-composite-svg"), 'Chromium smoke must verify upgraded composite SVG cards');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-vector-title"), 'Chromium smoke must verify live title text in result cards');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-composite-art-image"), 'Chromium smoke must inspect the central original artwork image');
assert.ok(workflow.includes("href.includes('/c_crop,')"), 'Chromium smoke must confirm result cards reference individual Cloudinary crops');
assert.ok(workflow.includes("href.includes('/q_100/f_avif/')"), 'Chromium smoke must confirm maximum-quality crop delivery');
assert.ok(workflow.includes("#tarot-card-zoom .tarot-composite-svg"), 'Chromium smoke must verify the zoom dialog uses the composite renderer');
assert.ok(workflow.includes("feConvolveMatrix').count(), 0"), 'Chromium smoke must verify the old raster-text sharpening filter is gone after upgrade');
assert.ok(workflow.includes('text: span.textContent.trim()'), 'production browser smoke must keep real DOM card-number validation');
assert.ok(workflow.includes("badgeState[0].text, '1'"), 'production browser smoke must keep first card-number validation');
assert.ok(workflow.includes("badgeState[1].text, '78'"), 'production browser smoke must keep last card-number validation');

console.log('tarot vector-composite and cropped-original production-smoke regression test passed');
