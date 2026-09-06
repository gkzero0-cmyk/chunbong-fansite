# Tarot Vector Composite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blurred full-card raster presentation with a composite tarot renderer that uses the existing super-resolved illustration only for the artwork area while rebuilding the frame and card labels as crisp SVG vectors/text.

**Architecture:** Keep the current 78-card data and Real-ESRGAN pair assets untouched. A new browser module upgrades each rendered legacy card SVG after it appears: it decodes the card index from the existing pair URL/x-offset, clips only the illustration region, draws a vector gold frame/title plate, and renders the canonical English title/rank as live SVG text. Reversed readings rotate only the illustration layer so labels remain legible. A small CSS layer disables the old whole-card rotation for upgraded cards and tunes result/zoom sizing.

**Tech Stack:** Vanilla JavaScript, SVG, CSS, Node regression tests, existing AVIF tarot assets.

**Spec:** User-approved direction in the current conversation: separate artwork/frame/text and keep expanded views crisp.

## Global Constraints

- Preserve the existing tarot selection, interpretation, AI reading, and 78-card asset mapping behavior.
- Do not regenerate or degrade the current Real-ESRGAN AVIF assets.
- English titles/rank marks must be live SVG text, never raster text.
- Reversed readings rotate only the illustration; vector text stays upright.
- The same composite renderer must upgrade both result cards and the zoom dialog.
- Keep a safe fallback: if the legacy descriptor cannot be decoded, leave the existing SVG untouched.

---

### Task 1: Regression contract for vector-composite cards

**Files:**
- Create: `tests/tarot-vector-composite-regression.mjs`
- Modify: `tarot.html`
- Create: `tarot-composite.js`
- Create: `tarot-composite.css`

**Interfaces:**
- Consumes: `window.CHUNBONG_TAROT_DATA.cards`, existing legacy SVG `<image href="assets/tarot/hd/pair-XX.avif" x="0|-960">`.
- Produces: `CHUNBONG_TAROT_COMPOSITE.cardDisplayMeta(card)`, `descriptorFromLegacyImage(href, x)`, `buildCompositeSvg(card, descriptor, reversed, uid)`.

- [ ] **Step 1: Write the failing test**

```js
assert.ok(fs.existsSync(new URL('../tarot-composite.js', import.meta.url)));
assert.ok(html.includes('tarot-composite.css'));
assert.ok(html.includes('tarot-composite.js'));
assert.equal(cardDisplayMeta(wandsNine).title, 'NINE OF WANDS');
assert.equal(cardDisplayMeta(wandsNine).rankMark, 'IX');
assert.match(buildCompositeSvg(wandsNine, { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 }, false, 't'), /tarot-vector-title/);
```

- [ ] **Step 2: Run the Site regression workflow and verify this new test fails because the composite renderer is absent.**
- [ ] **Step 3: Implement the minimal composite module, CSS, and HTML includes.**
- [ ] **Step 4: Run the Site regression workflow and verify all tests pass.**
- [ ] **Step 5: Commit the implementation on the isolated feature branch.**

### Task 2: Production rendering verification

**Files:**
- Modify only if necessary after browser verification: `tarot-composite.js`, `tarot-composite.css`, `tarot.html`.

**Interfaces:**
- Consumes: result-grid and zoom-dialog mutations from `tarot.js`.
- Produces: `.tarot-card-composite` containers with `.tarot-composite-svg` markup in both result and zoom views.

- [ ] **Step 1: Verify the feature branch deploy/site regression is green.**
- [ ] **Step 2: Review the PR diff for accidental changes outside tarot rendering.**
- [ ] **Step 3: Merge to `main` after green verification.**
- [ ] **Step 4: Verify Vercel success for the merged commit and re-check current `main`.
