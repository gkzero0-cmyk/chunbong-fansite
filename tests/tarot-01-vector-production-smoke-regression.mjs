import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync(new URL('../.github/workflows/tarot-production-smoke.yml', import.meta.url), 'utf8');
const cloudinaryBase = 'https://res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/tarot-original';

assert.ok(workflow.includes("- 'tarot-composite.js'"), 'production smoke must trigger when the vector composite renderer changes');
assert.ok(workflow.includes("- 'tarot-composite.css'"), 'production smoke must trigger when the vector composite styles change');
assert.ok(workflow.includes('COMPOSITE_JS_HTTP='), 'production readiness polling must fetch tarot-composite.js');
assert.ok(workflow.includes('COMPOSITE_CSS_HTTP='), 'production readiness polling must fetch tarot-composite.css');
assert.ok(workflow.includes('ORIGINAL_ASSET_HTTP='), 'production readiness polling must fetch the uploaded-original artwork sheet');
assert.ok(workflow.includes(`ORIGINAL_BASE='${cloudinaryBase}'`), 'production smoke must pin the Cloudinary original-art base URL');
assert.ok(workflow.includes('$ORIGINAL_BASE/sheet-0.avif'), 'production smoke must verify the first Cloudinary original sheet');
assert.ok(workflow.includes('$ORIGINAL_BASE/sheet-5.avif'), 'production smoke must verify the last Cloudinary original sheet');
assert.ok(!workflow.includes("- 'assets/tarot/original/**'"), 'Cloudinary-backed originals must not pretend to be repository binary assets');
assert.ok(workflow.includes("grep -q 'tarot-composite.js' /tmp/tarot-page"), 'production page must prove the composite renderer is loaded');
assert.ok(workflow.includes("grep -q 'originalArtworkDescriptor' /tmp/tarot-composite-js"), 'production JS must prove uploaded-original mapping is deployed');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-composite-svg"), 'Chromium smoke must verify upgraded composite SVG cards');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-vector-title"), 'Chromium smoke must verify live title text in result cards');
assert.ok(workflow.includes("#tarot-reading-grid .tarot-composite-art-image"), 'Chromium smoke must inspect the central original artwork image');
assert.ok(workflow.includes('res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/tarot-original/sheet-'), 'Chromium smoke must confirm result cards actually reference Cloudinary originals');
assert.ok(workflow.includes("#tarot-card-zoom .tarot-composite-svg"), 'Chromium smoke must verify the zoom dialog uses the composite renderer');
assert.ok(workflow.includes("feConvolveMatrix').count(), 0"), 'Chromium smoke must verify the old raster-text sharpening filter is gone after upgrade');

console.log('tarot vector-composite production-smoke regression test passed');
