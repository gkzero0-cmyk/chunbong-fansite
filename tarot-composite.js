const TAROT_COMPOSITE_DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;

const MAJOR_TITLES = [
  'THE FOOL', 'THE MAGICIAN', 'THE HIGH PRIESTESS', 'THE EMPRESS', 'THE EMPEROR',
  'THE HIEROPHANT', 'THE LOVERS', 'THE CHARIOT', 'STRENGTH', 'THE HERMIT',
  'WHEEL OF FORTUNE', 'JUSTICE', 'THE HANGED MAN', 'DEATH', 'TEMPERANCE',
  'THE DEVIL', 'THE TOWER', 'THE STAR', 'THE MOON', 'THE SUN', 'JUDGEMENT', 'THE WORLD'
];

const MAJOR_MARKS = [
  '0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
  'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'
];

const RANK_META = {
  ace: { title: 'ACE', mark: 'A' },
  '02': { title: 'TWO', mark: 'II' },
  '03': { title: 'THREE', mark: 'III' },
  '04': { title: 'FOUR', mark: 'IV' },
  '05': { title: 'FIVE', mark: 'V' },
  '06': { title: 'SIX', mark: 'VI' },
  '07': { title: 'SEVEN', mark: 'VII' },
  '08': { title: 'EIGHT', mark: 'VIII' },
  '09': { title: 'NINE', mark: 'IX' },
  '10': { title: 'TEN', mark: 'X' },
  page: { title: 'PAGE', mark: 'PAGE' },
  knight: { title: 'KNIGHT', mark: 'KNIGHT' },
  queen: { title: 'QUEEN', mark: 'QUEEN' },
  king: { title: 'KING', mark: 'KING' }
};

const SUIT_TITLES = {
  swords: 'SWORDS',
  wands: 'WANDS',
  cups: 'CUPS',
  pentacles: 'PENTACLES'
};

const ORIGINAL_CLOUDINARY_BASE = 'https://res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/tarot-original';
const ORIGINAL_SHEET_CELL_WIDTH = 898;
const ORIGINAL_SHEET_HEIGHT = 1488;
const ORIGINAL_SHEET_CARD_COUNT = 13;
const ORIGINAL_SHEET_WIDTH = ORIGINAL_SHEET_CELL_WIDTH * ORIGINAL_SHEET_CARD_COUNT;

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[character]));
}

function cardDisplayMeta(card) {
  if (!card || typeof card !== 'object') return { title: 'TAROT', rankMark: '✦' };
  if (card.arcana === 'major') {
    const number = Number(card.number);
    if (Number.isInteger(number) && number >= 0 && number < MAJOR_TITLES.length) {
      return { title: MAJOR_TITLES[number], rankMark: MAJOR_MARKS[number] };
    }
  }

  const [suitId, rankId] = String(card.id || '').split('-');
  const rank = RANK_META[rankId];
  const suit = SUIT_TITLES[suitId];
  if (rank && suit) return { title: `${rank.title} OF ${suit}`, rankMark: rank.mark };

  return { title: String(card.nameKo || 'TAROT').toUpperCase(), rankMark: '✦' };
}

function descriptorFromLegacyImage(href, x) {
  const url = String(href || '');
  const match = url.match(/(?:^|\/)pair-(\d{2})\.avif(?:[?#].*)?$/);
  const sourceX = Number(x);
  if (!match || !Number.isFinite(sourceX)) return null;
  const pair = Number(match[1]);
  if (!Number.isInteger(pair) || pair < 0 || pair > 38) return null;
  const pairSlot = sourceX <= -480 ? 1 : 0;
  const cardIndex = pair * 2 + pairSlot;
  if (cardIndex < 0 || cardIndex > 77) return null;
  return { cardIndex, url, sourceX: pairSlot === 1 ? -960 : 0 };
}

function originalArtworkDescriptor(card) {
  const cardIndex = Number(card?.deckNumber) - 1;
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 77) return null;
  const sheet = Math.floor(cardIndex / ORIGINAL_SHEET_CARD_COUNT);
  const slot = cardIndex % ORIGINAL_SHEET_CARD_COUNT;
  return {
    cardIndex,
    sheet,
    slot,
    url: `${ORIGINAL_CLOUDINARY_BASE}/sheet-${sheet}.avif`,
    sourceX: slot === 0 ? 0 : -(slot * ORIGINAL_SHEET_CELL_WIDTH),
    sheetWidth: ORIGINAL_SHEET_WIDTH,
    sheetHeight: ORIGINAL_SHEET_HEIGHT,
    cellWidth: ORIGINAL_SHEET_CELL_WIDTH,
    cellHeight: ORIGINAL_SHEET_HEIGHT
  };
}

function titleFontSize(title) {
  const length = String(title || '').length;
  if (length >= 19) return 42;
  if (length >= 16) return 46;
  if (length >= 13) return 50;
  return 56;
}

function buildCompositeSvg(card, descriptor, reversed = false, uid = 'tarot-composite') {
  const original = originalArtworkDescriptor(card);
  const artwork = original || (descriptor?.url ? {
    cardIndex: Number(card?.deckNumber) - 1,
    url: descriptor.url,
    sourceX: Number(descriptor.sourceX) <= -480 ? -960 : 0,
    sheetWidth: 1920,
    sheetHeight: 1440,
    cellWidth: 960,
    cellHeight: 1440
  } : null);
  if (!artwork?.url) return '';

  const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '-');
  const meta = cardDisplayMeta(card);
  const title = escapeXml(meta.title);
  const rankMark = escapeXml(meta.rankMark);
  const imageUrl = escapeXml(artwork.url);
  const artTransform = reversed ? ' transform="rotate(180 480 656)"' : '';
  const fontSize = titleFontSize(meta.title);

  return `<svg class="tarot-composite-svg" viewBox="0 0 960 1440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="${safeUid}-frame-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff0aa"/>
        <stop offset="0.18" stop-color="#c78c24"/>
        <stop offset="0.5" stop-color="#f8d978"/>
        <stop offset="0.78" stop-color="#9d6418"/>
        <stop offset="1" stop-color="#ffe7a0"/>
      </linearGradient>
      <linearGradient id="${safeUid}-plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff4c3"/>
        <stop offset="0.5" stop-color="#e8c46e"/>
        <stop offset="1" stop-color="#b67a24"/>
      </linearGradient>
      <linearGradient id="${safeUid}-shadow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3a220b"/>
        <stop offset="0.5" stop-color="#0d0905"/>
        <stop offset="1" stop-color="#4a2e0e"/>
      </linearGradient>
      <clipPath id="${safeUid}-art-clip"><rect x="88" y="126" width="784" height="1060" rx="34"/></clipPath>
    </defs>

    <rect class="tarot-vector-frame" x="18" y="18" width="924" height="1404" rx="58" fill="url(#${safeUid}-shadow)" stroke="url(#${safeUid}-frame-gold)" stroke-width="18"/>
    <rect class="tarot-vector-frame" x="45" y="45" width="870" height="1350" rx="43" fill="#120d07" stroke="#f7d77a" stroke-width="5"/>
    <rect x="68" y="102" width="824" height="1110" rx="38" fill="#080604" stroke="url(#${safeUid}-frame-gold)" stroke-width="11"/>

    <g class="tarot-composite-art-layer" clip-path="url(#${safeUid}-art-clip)">
      <g class="tarot-composite-art-rotation"${artTransform}>
        <svg class="tarot-composite-art-viewport" x="0" y="0" width="960" height="1440" viewBox="0 0 ${artwork.cellWidth} ${artwork.cellHeight}" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image class="tarot-composite-art-image" href="${imageUrl}" x="${artwork.sourceX}" y="0" width="${artwork.sheetWidth}" height="${artwork.sheetHeight}" preserveAspectRatio="none"/>
        </svg>
      </g>
    </g>

    <rect x="78" y="116" width="804" height="1080" rx="35" fill="none" stroke="#f8da7e" stroke-width="8"/>
    <rect x="87" y="125" width="786" height="1062" rx="29" fill="none" stroke="#7d4c12" stroke-width="3"/>

    <g aria-hidden="true" fill="url(#${safeUid}-frame-gold)" stroke="#5f370d" stroke-width="3">
      <circle cx="86" cy="86" r="25"/><circle cx="874" cy="86" r="25"/>
      <circle cx="86" cy="1354" r="25"/><circle cx="874" cy="1354" r="25"/>
      <path d="M111 75h145l24 11-24 11H111l-16-11z"/><path d="M849 75H704l-24 11 24 11h145l16-11z"/>
      <path d="M111 1343h145l24 11-24 11H111l-16-11z"/><path d="M849 1343H704l-24 11 24 11h145l16-11z"/>
    </g>

    <g class="tarot-vector-rank-medallion">
      <ellipse cx="480" cy="82" rx="76" ry="52" fill="url(#${safeUid}-plate)" stroke="#9a6117" stroke-width="7"/>
      <ellipse cx="480" cy="82" rx="66" ry="43" fill="none" stroke="#fff0a5" stroke-width="3"/>
      <text class="tarot-vector-rank" x="480" y="98" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${rankMark.length > 4 ? 28 : 48}" font-weight="700" fill="#281607" stroke="#fff3bd" stroke-width="1" paint-order="stroke">${rankMark}</text>
    </g>

    <g class="tarot-vector-title-plate">
      <path d="M112 1222H848Q881 1222 881 1255V1340Q881 1374 848 1374H112Q79 1374 79 1340V1255Q79 1222 112 1222Z" fill="url(#${safeUid}-plate)" stroke="#87500f" stroke-width="8"/>
      <path d="M105 1240H855V1356H105Z" fill="#f8e6aa" fill-opacity=".34" stroke="#fff0b0" stroke-width="3"/>
      <text class="tarot-vector-title" x="480" y="1322" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" letter-spacing="2" fill="#241407" stroke="#fff4c4" stroke-width="1.6" paint-order="stroke">${title}</text>
    </g>
  </svg>`;
}

function upgradeLegacySvg(svg) {
  if (!svg || svg.classList?.contains('tarot-composite-svg')) return false;
  const image = svg.querySelector?.('image');
  if (!image) return false;
  const href = image.getAttribute('href') || image.getAttribute('xlink:href');
  const descriptor = descriptorFromLegacyImage(href, image.getAttribute('x') || 0);
  if (!descriptor) return false;
  const card = TAROT_COMPOSITE_DATA?.cards?.[descriptor.cardIndex];
  if (!card) return false;
  const art = svg.closest?.('.tarot-card-art');
  const reversed = Boolean(art?.classList.contains('is-reversed'));
  const uid = `tarot-composite-${descriptor.cardIndex}-${Math.random().toString(36).slice(2, 9)}`;
  const template = document.createElement('template');
  template.innerHTML = buildCompositeSvg(card, descriptor, reversed, uid).trim();
  const replacement = template.content.firstElementChild;
  if (!replacement) return false;
  svg.replaceWith(replacement);
  art?.classList.add('tarot-card-composite');
  art?.setAttribute('data-card-index', String(descriptor.cardIndex));
  art?.setAttribute('data-card-direction', reversed ? 'reversed' : 'upright');
  return true;
}

function upgradeAll(root = document) {
  const candidates = [];
  if (root?.matches?.('.tarot-card-art-svg')) candidates.push(root);
  root?.querySelectorAll?.('.tarot-card-art-svg').forEach(svg => candidates.push(svg));
  candidates.forEach(upgradeLegacySvg);
  return candidates.length;
}

const TAROT_COMPOSITE_API = {
  cardDisplayMeta,
  descriptorFromLegacyImage,
  originalArtworkDescriptor,
  buildCompositeSvg,
  upgradeLegacySvg,
  upgradeAll
};

if (typeof window !== 'undefined') window.CHUNBONG_TAROT_COMPOSITE = TAROT_COMPOSITE_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_COMPOSITE_API;

if (typeof document !== 'undefined') {
  const runUpgrade = node => {
    try { upgradeAll(node || document); } catch (_) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => runUpgrade(document), { once: true });
  else runUpgrade(document);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node?.nodeType === 1) runUpgrade(node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
