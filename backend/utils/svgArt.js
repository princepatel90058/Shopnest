const crypto = require('node:crypto');

const PALETTES = [
    ['#f59e0b', '#fde68a'],
    ['#0ea5e9', '#bae6fd'],
    ['#10b981', '#a7f3d0'],
    ['#8b5cf6', '#ddd6fe'],
    ['#ef4444', '#fecaca'],
    ['#14b8a6', '#99f6e4'],
    ['#f97316', '#fed7aa'],
    ['#6366f1', '#c7d2fe']
];

// Each category gets a consistent colour identity (like real marketplace tiles);
// unknown categories fall back to a hash-derived palette.
const CATEGORY_PALETTES = {
    mobiles: ['#6366f1', '#c7d2fe'],
    computers: ['#10b981', '#a7f3d0'],
    audio: ['#0ea5e9', '#bae6fd'],
    wearables: ['#8b5cf6', '#ddd6fe'],
    gaming: ['#ec4899', '#fbcfe8'],
    tv: ['#f97316', '#fed7aa'],
    cameras: ['#ef4444', '#fecaca'],
    appliances: ['#14b8a6', '#99f6e4'],
    fitness: ['#e11d48', '#fecdd3'],
    home: ['#f59e0b', '#fde68a'],
    accessories: ['#84cc16', '#d9f99d']
};

const escapeXml = value =>
    String(value).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function paletteFor(product) {
    const mapped = product && CATEGORY_PALETTES[product.category];
    if (mapped) return mapped;
    const key = product && (product.slug || product.name) || 'shopnest';
    const hash = crypto.createHash('md5').update(String(key)).digest();
    return PALETTES[hash[0] % PALETTES.length];
}

function productSvg(product) {
    const [dark, light] = paletteFor(product);
    const emoji = escapeXml(product.emoji || '🛍️');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${escapeXml(product.name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="640" cy="150" r="130" fill="#ffffff" opacity="0.14"/>
  <circle cx="150" cy="660" r="180" fill="#ffffff" opacity="0.10"/>
  <circle cx="400" cy="430" r="215" fill="#ffffff" opacity="0.16"/>
  <text x="400" y="445" font-size="230" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="400" y="725" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#0f172a" opacity="0.55" text-anchor="middle">${escapeXml(product.category || 'ShopNest')}</text>
</svg>`;
}

function placeholderSvg(label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${escapeXml(label)}">
  <rect width="800" height="800" fill="#e9e4dc"/>
  <circle cx="400" cy="400" r="210" fill="#f7f5f1"/>
  <text x="400" y="415" font-size="210" text-anchor="middle" dominant-baseline="middle">🛍️</text>
  <text x="400" y="700" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="#5c6675" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
}

function logoSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect x="6" y="18" width="52" height="40" rx="12" fill="url(#g)"/>
  <path d="M22 26v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
  <circle cx="24" cy="38" r="3.5" fill="#fff7ed"/>
  <circle cx="40" cy="38" r="3.5" fill="#fff7ed"/>
</svg>`;
}

module.exports = { productSvg, placeholderSvg, logoSvg };
