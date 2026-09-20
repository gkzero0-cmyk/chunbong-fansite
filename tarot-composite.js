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

const ORIGINAL_CLOUDINARY_ROOT = 'https://res.cloudinary.com/lyppgyei/image/upload';
const ORIGINAL_CLOUDINARY_PUBLIC_ID = 'chunbong-fansite/tarot-original';
const ORIGINAL_SHEET_CELL_WIDTH = 898;
const ORIGINAL_SHEET_HEIGHT = 1488;
const ORIGINAL_SHEET_CARD_COUNT = 13;

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
  const cropX = slot * ORIGINAL_SHEET_CELL_WIDTH;
  const transform = `c_crop,g_north_west,h_${ORIGINAL_SHEET_HEIGHT},w_${ORIGINAL_SHEET_CELL_WIDTH},x_${cropX},y_0/f_auto/q_auto`;
  return {
    cardIndex,
    sheet,
    slot,
    cropX,
    url: `${ORIGINAL_CLOUDINARY_ROOT}/${transform}/${ORIGINAL_CLOUDINARY_PUBLIC_ID}/sheet-${sheet}.avif`,
    sourceX: 0,
    sheetWidth: ORIGINAL_SHEET_CELL_WIDTH,
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

  return `<svg class="tarot-composite-svg tarot-fortune-frame" data-frame-theme="daily-fortune" viewBox="0 0 960 1440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="${safeUid}-frame-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff1a0"/>
        <stop offset="0.16" stop-color="#e4a72e"/>
        <stop offset="0.43" stop-color="#ffd95d"/>
        <stop offset="0.72" stop-color="#a96d15"/>
        <stop offset="1" stop-color="#ffe783"/>
      </linearGradient>
      <linearGradient id="${safeUid}-plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a315b"/>
        <stop offset="0.48" stop-color="#0c1d3d"/>
        <stop offset="1" stop-color="#061128"/>
      </linearGradient>
      <linearGradient id="${safeUid}-shadow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b1b3a"/>
        <stop offset="0.5" stop-color="#030916"/>
        <stop offset="1" stop-color="#10264a"/>
      </linearGradient>
      <clipPath id="${safeUid}-art-clip"><rect x="88" y="126" width="784" height="1060" rx="34"/></clipPath>
    </defs>

    <rect class="tarot-vector-frame tarot-fortune-frame-outer" x="18" y="18" width="924" height="1404" rx="58" fill="url(#${safeUid}-shadow)" stroke="#efbd43" stroke-width="8"/>
    <rect class="tarot-vector-frame tarot-fortune-frame-mid" x="38" y="38" width="884" height="1364" rx="47" fill="#07142d" stroke="#ffd55c" stroke-width="4"/>
    <rect class="tarot-vector-frame tarot-fortune-frame-inner" x="52" y="52" width="856" height="1336" rx="39" fill="none" stroke="#9f6916" stroke-width="2"/>
    <rect class="tarot-fortune-art-shell" x="72" y="108" width="816" height="1096" rx="36" fill="#020817" stroke="#dca52c" stroke-width="4"/>

    <g class="tarot-composite-art-layer" clip-path="url(#${safeUid}-art-clip)">
      <g class="tarot-composite-art-rotation"${artTransform}>
        <svg class="tarot-composite-art-viewport" x="0" y="0" width="960" height="1440" viewBox="0 0 ${artwork.cellWidth} ${artwork.cellHeight}" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image class="tarot-composite-art-image" href="${imageUrl}" x="${artwork.sourceX}" y="0" width="${artwork.sheetWidth}" height="${artwork.sheetHeight}" preserveAspectRatio="none"/>
        </svg>
      </g>
    </g>

    <rect class="tarot-fortune-art-line" x="78" y="116" width="804" height="1080" rx="35" fill="none" stroke="#ffd55c" stroke-width="3"/>
    <rect class="tarot-fortune-art-line" x="87" y="125" width="786" height="1062" rx="29" fill="none" stroke="#8f5d16" stroke-width="1.5"/>

    <g aria-hidden="true" stroke="url(#${safeUid}-frame-gold)">
      <g fill="#07142d" stroke-width="3">
        <circle cx="86" cy="86" r="27"/><circle cx="874" cy="86" r="27"/>
        <circle cx="86" cy="1354" r="27"/><circle cx="874" cy="1354" r="27"/>
      </g>
      <g fill="#ffd75b" stroke="#9b6415" stroke-width="2">
        <path d="M86 66l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M874 66l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M86 1334l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M874 1334l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
      </g>
      <g fill="url(#${safeUid}-frame-gold)" stroke="#71470f" stroke-width="2">
        <path d="M116 78h128l26 8-26 8H116l-17-8z"/><path d="M844 78H716l-26 8 26 8h128l17-8z"/>
        <path d="M116 1346h128l26 8-26 8H116l-17-8z"/><path d="M844 1346H716l-26 8 26 8h128l17-8z"/>
      </g>
      <g fill="#f7c94c" stroke="none">
        <circle cx="292" cy="86" r="4"/><circle cx="314" cy="86" r="3"/><circle cx="336" cy="86" r="4"/>
        <circle cx="624" cy="86" r="4"/><circle cx="646" cy="86" r="3"/><circle cx="668" cy="86" r="4"/>
        <circle cx="292" cy="1354" r="4"/><circle cx="314" cy="1354" r="3"/><circle cx="336" cy="1354" r="4"/>
        <circle cx="624" cy="1354" r="4"/><circle cx="646" cy="1354" r="3"/><circle cx="668" cy="1354" r="4"/>
      </g>
    </g>

    <g class="tarot-vector-rank-medallion">
      <ellipse cx="480" cy="82" rx="76" ry="52" fill="url(#${safeUid}-plate)" stroke="#efbd43" stroke-width="4"/>
      <ellipse cx="480" cy="82" rx="66" ry="43" fill="none" stroke="#ffd55c" stroke-width="2"/>
      <path d="M480 49l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#ffd75b" opacity=".22"/>
      <text class="tarot-vector-rank" x="480" y="98" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${rankMark.length > 4 ? 28 : 48}" font-weight="700" fill="#ffe27a" stroke="#201000" stroke-width="1.4" paint-order="stroke">${rankMark}</text>
    </g>

    <g class="tarot-vector-title-plate">
      <path d="M112 1222H848Q881 1222 881 1255V1340Q881 1374 848 1374H112Q79 1374 79 1340V1255Q79 1222 112 1222Z" fill="url(#${safeUid}-plate)" stroke="#e9b638" stroke-width="4"/>
      <path d="M105 1240H855V1356H105Z" fill="#081832" fill-opacity=".8" stroke="#ffd55c" stroke-width="2"/>
      <path d="M134 1298h112M714 1298h112" stroke="#dca62f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="264" cy="1298" r="4" fill="#f5cd4f"/><circle cx="696" cy="1298" r="4" fill="#f5cd4f"/>
      <text class="tarot-vector-title" x="480" y="1322" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" letter-spacing="2" fill="#fff0ae" stroke="#1a0d00" stroke-width="1.8" paint-order="stroke">${title}</text>
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
