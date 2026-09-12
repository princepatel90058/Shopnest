/* ShopNest storefront JS — shared helpers, chrome, cart & wishlist */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const productImg = slug => `/img/products/${slug}.svg`;

async function api(path, options = {}) {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(data.message || `Request failed (${res.status})`);
        error.status = res.status;
        throw error;
    }
    return data;
}

let toastTimer;
function toast(message) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- Cart store (localStorage) ---------- */
const CART_KEY = 'shopnest_cart_v1';
const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const writeCart = items => { localStorage.setItem(CART_KEY, JSON.stringify(items)); updateCartBadge(); };
const cartCount = () => readCart().reduce((sum, line) => sum + line.qty, 0);

function updateCartBadge() {
    const badge = $('#cart-count');
    if (badge) {
        const count = cartCount();
        badge.textContent = count;
        badge.style.display = count ? 'grid' : 'none';
    }
}

async function addToCart(slug, qty = 1) {
    const { product } = await api(`/api/products/${slug}`);
    if (product.stock <= 0) { toast('Sorry, this product is out of stock.'); return; }
    const cart = readCart();
    const line = cart.find(item => item.slug === slug);
    const nextQty = Math.min((line ? line.qty : 0) + qty, Math.min(product.stock, 5));
    if (line) line.qty = nextQty; else cart.push({ slug, qty: nextQty });
    writeCart(cart);
    toast(`Added ${product.name} to cart`);
}

/* ---------- Header & footer ---------- */
const CATEGORIES = [
    { name: 'mobiles', emoji: '📱' }, { name: 'computers', emoji: '💻' },
    { name: 'audio', emoji: '🎧' }, { name: 'wearables', emoji: '⌚' },
    { name: 'gaming', emoji: '🎮' }, { name: 'tv', emoji: '📺' },
    { name: 'cameras', emoji: '📷' }, { name: 'appliances', emoji: '🍳' },
    { name: 'fitness', emoji: '🏋️' }, { name: 'home', emoji: '🏠' },
    { name: 'accessories', emoji: '🎒' }
];

function renderHeader() {
    const page = document.body.dataset.page;
    const params = new URLSearchParams(location.search);
    $('#site-header').innerHTML = `
        <div class="announce">Free shipping over ₹999 &nbsp;·&nbsp; <b>Cash on delivery</b> &nbsp;·&nbsp; 7-day easy returns</div>
        <div class="container header-row">
            <a class="logo" href="/"><img src="/img/logo.svg" alt="">Shop<em>Nest</em></a>
            <form class="search-form" action="/shop" method="get" role="search">
                <input name="search" placeholder="Search products…" value="${esc(params.get('search') || '')}" aria-label="Search products">
                <button type="submit" aria-label="Search">🔍</button>
            </form>
            <nav class="header-actions">
                <a class="header-link" href="/account" id="account-link">👤 <span id="account-name">Account</span></a>
                <a class="header-link" href="/cart">🛒 Cart <span class="badge" id="cart-count">0</span></a>
            </nav>
        </div>
        <nav class="cat-nav">
            <div class="container">
                <a href="/shop" class="${page === 'shop' && !params.get('category') ? 'active' : ''}">All products</a>
                ${CATEGORIES.map(c => `<a href="/shop?category=${c.name}" class="${page === 'shop' && params.get('category') === c.name ? 'active' : ''}">${c.emoji} ${c.name}</a>`).join('')}
            </div>
        </nav>`;
    updateCartBadge();
    api('/api/auth/me').then(({ user }) => {
        if (user) $('#account-name').textContent = user.name.split(' ')[0];
    }).catch(() => {});
}

function renderFooter() {
    $('#site-footer').innerHTML = `
        <div class="container footer-grid">
            <div class="footer-brand">
                <a class="logo" href="/" style="color:#fff"><img src="/img/logo.svg" alt="">Shop<em>Nest</em></a>
                <p>From phones to kitchen appliances — 64 handpicked products across 11 categories, with cash on delivery and easy returns.</p>
            </div>
            <div><h4>Shop</h4><ul>
                <li><a href="/shop">All products</a></li>
                <li><a href="/shop?category=mobiles">Mobiles</a></li>
                <li><a href="/shop?category=audio">Audio</a></li>
                <li><a href="/shop?category=tv">TVs &amp; appliances</a></li>
                <li><a href="/shop?category=home">Home &amp; kitchen</a></li>
            </ul></div>
            <div><h4>Account</h4><ul>
                <li><a href="/account">Sign in / Register</a></li>
                <li><a href="/cart">Your cart</a></li>
                <li><a href="/account">Your orders</a></li>
            </ul></div>
            <div><h4>Support</h4><ul>
                <li><a href="#">Shipping &amp; returns</a></li>
                <li><a href="#">Contact us</a></li>
                <li><a href="#">FAQs</a></li>
            </ul></div>
        </div>
        <div class="container footer-bottom">
            <span>© ${new Date().getFullYear()} ShopNest. All rights reserved.</span>
            <span class="demo-chip" id="mode-chip">Loading…</span>
        </div>`;
    api('/api/health').then(({ mode }) => {
        $('#mode-chip').textContent = mode === 'mongodb' ? 'Live · MongoDB connected' : 'Demo mode · sample catalog';
    }).catch(() => { $('#mode-chip').textContent = 'Offline'; });
}

/* ---------- Product cards & states ---------- */
function stars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function productCard(p) {
    const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
    return `
    <article class="card product-card">
        ${p.badge ? `<span class="pill">${esc(p.badge)}</span>` : ''}
        <a href="/product/${p.slug}" class="thumb"><img src="${productImg(p.slug)}" alt="${esc(p.name)}" loading="lazy"></a>
        <div class="body">
            <span class="cat">${esc(p.brand || p.category)}</span>
            <h3><a href="/product/${p.slug}">${esc(p.name)}</a></h3>
            <span class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} <span class="count">(${p.reviews.toLocaleString('en-IN')})</span></span>
            <div class="price-row">
                <span class="price">${inr(p.price)}</span>
                ${p.mrp > p.price ? `<s class="mrp">${inr(p.mrp)}</s><span class="off">${off}% off</span>` : ''}
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" data-add="${p.slug}">Add to cart</button>
        </div>
    </article>`;
}

const stateHTML = (icon, title, text) =>
    `<div class="state"><div class="icon">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;

const loadingHTML = '<div class="state"><div class="spinner"></div>Loading…</div>';

/* ---------- Global wiring ---------- */
document.addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (button) addToCart(button.dataset.add).catch(err => toast(err.message));
});

document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    const page = document.body.dataset.page;
    if (page === 'home') renderHomePage();
    if (page === 'shop') renderShopPage();
    if (page === 'product') renderProductPage();
    if (page === 'cart') renderCartPage();
    if (page === 'checkout') renderCheckoutPage();
    if (page === 'order') renderOrderPage();
    if (page === 'account') renderAccountPage();
});


