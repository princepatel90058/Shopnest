/* ShopNest page renderers (loaded after site.js) */

/* ---------- Home ---------- */
async function renderHomePage() {
    $('#cat-strip').innerHTML = CATEGORIES.map(c =>
        `<a class="cat-tile" href="/shop?category=${c.name}"><span class="emoji">${c.emoji}</span>${c.name}</a>`).join('');
    const grid = $('#featured-grid');
    grid.innerHTML = loadingHTML;
    try {
        const { products } = await api('/api/products?limit=8');
        grid.innerHTML = products.map(productCard).join('');
    } catch (error) {
        grid.innerHTML = stateHTML('⚠️', 'Could not load products', error.message);
    }
    const deals = $('#deals-grid');
    if (deals) {
        deals.innerHTML = loadingHTML;
        try {
            const { products } = await api('/api/products?sort=discount&limit=8');
            deals.innerHTML = products.map(productCard).join('');
        } catch (error) {
            deals.innerHTML = stateHTML('⚠️', 'Could not load deals', error.message);
        }
    }
}

/* ---------- Shop ---------- */
async function renderShopPage() {
    const params = new URLSearchParams(location.search);
    const query = {
        search: params.get('search') || '',
        category: params.get('category') || 'all',
        sort: params.get('sort') || 'featured'
    };
    $('#sort-select').value = query.sort;
    $('#sort-select').addEventListener('change', () => {
        params.set('sort', $('#sort-select').value);
        location.search = params.toString();
    });
    const heading = query.search ? `Results for “${query.search}”`
        : query.category !== 'all' ? `${query.category} products` : 'All products';
    $('#shop-title').textContent = heading;
    document.title = `${heading} · ShopNest`;

    const grid = $('#shop-grid');
    grid.innerHTML = loadingHTML;
    const search = new URLSearchParams({ search: query.search, category: query.category, sort: query.sort });
    try {
        const { total, products } = await api(`/api/products?${search}`);
        $('#shop-count').textContent = `${total} product${total === 1 ? '' : 's'}`;
        grid.innerHTML = products.length
            ? products.map(productCard).join('')
            : stateHTML('🔍', 'No products found', 'Try a different search or category.');
    } catch (error) {
        grid.innerHTML = stateHTML('⚠️', 'Could not load products', error.message);
    }
}

/* ---------- Product detail ---------- */
async function renderProductPage() {
    const slug = location.pathname.split('/').pop();
    const view = $('#product-view');
    view.innerHTML = loadingHTML;
    let data;
    try {
        data = await api(`/api/products/${slug}`);
    } catch (error) {
        view.innerHTML = stateHTML('🧐', 'Product not found', 'It may have been removed. Browse the shop instead.');
        return;
    }
    const { product: p, related } = data;
    const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
    const stockClass = p.stock === 0 ? 'out' : p.stock < 25 ? 'low' : 'in';
    const stockText = p.stock === 0 ? 'Out of stock' : p.stock < 25 ? `Only ${p.stock} left — order soon` : 'In stock';
    document.title = `${p.name} · ShopNest`;
    $('#breadcrumb').innerHTML = `<a href="/">Home</a> › <a href="/shop?category=${p.category}">${esc(p.category)}</a> › ${esc(p.name)}`;
    view.innerHTML = `
    <div class="product-page">
        <div class="gallery"><div class="main"><img src="${productImg(p.slug)}" alt="${esc(p.name)}"></div></div>
        <div class="pd-info">
            ${p.badge ? `<span class="pill" style="position:static;display:inline-block">${esc(p.badge)}</span>` : ''}
            <h1>${esc(p.name)}</h1>
            ${p.brand ? `<p class="pd-brand">by <a href="/shop?search=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a></p>` : ''}
            <span class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${p.reviews.toLocaleString('en-IN')} reviews</span>
            <div class="pd-price">
                <span class="price">${inr(p.price)}</span>
                ${p.mrp > p.price ? `<s class="mrp">${inr(p.mrp)}</s><span class="off">${off}% off</span>` : ''}
            </div>
            <p class="stock ${stockClass}">${stockText}</p>
            <p>${esc(p.blurb)}</p>
            <div class="pd-actions">
                <div class="qty">
                    <button type="button" id="qty-minus" aria-label="Decrease">−</button>
                    <input id="qty-input" value="1" readonly aria-label="Quantity">
                    <button type="button" id="qty-plus" aria-label="Increase">+</button>
                </div>
                <button class="btn btn-primary" id="add-btn" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button>
                <a class="btn btn-dark" href="/checkout" id="buy-btn" ${p.stock === 0 ? 'hidden' : ''}>Buy now</a>
            </div>
            <ul class="feature-list">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
            <div class="assure">
                <div><b>🚚 Free shipping</b>on orders ₹999+</div>
                <div><b>💵 COD available</b>pay on delivery</div>
                <div><b>↩️ 7-day returns</b>no questions asked</div>
            </div>
        </div>
    </div>`;
    let qty = 1;
    const input = $('#qty-input');
    $('#qty-minus').onclick = () => { qty = Math.max(1, qty - 1); input.value = qty; };
    $('#qty-plus').onclick = () => { qty = Math.min(Math.min(p.stock, 5), qty + 1); input.value = qty; };
    $('#add-btn').onclick = () => addToCart(p.slug, qty).catch(err => toast(err.message));
    $('#buy-btn').addEventListener('click', event => {
        if (!cartCount()) {
            event.preventDefault();
            addToCart(p.slug, qty).then(() => { location.href = '/checkout'; }).catch(err => toast(err.message));
        }
    });
    const grid = $('#related-grid');
    grid.innerHTML = related.length ? related.map(productCard).join('') : '';
}

/* ---------- Cart ---------- */
function summaryHTML(itemsTotal, shipping) {
    const total = itemsTotal + shipping;
    const missing = Math.max(0, 999 - itemsTotal);
    return `
    <div class="free-ship-note">${missing > 0 ? `Add ${inr(missing)} more for free shipping` : '🎉 You unlocked free shipping!'}</div>
    <div class="sum-row"><span>Items (${itemsTotal ? readCart().reduce((s, l) => s + l.qty, 0) : 0})</span><span>${inr(itemsTotal)}</span></div>
    <div class="sum-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : inr(shipping)}</span></div>
    <div class="sum-row total"><span>Total</span><span>${inr(total)}</span></div>`;
}

async function renderCartPage() {
    const list = $('#cart-lines');
    const summary = $('#cart-summary');
    const cart = readCart();
    if (!cart.length) {
        list.innerHTML = stateHTML('🛒', 'Your cart is empty', 'Browse the shop and add something you love.') +
            '<div style="text-align:center;margin-top:8px"><a class="btn btn-primary" href="/shop">Continue shopping</a></div>';
        summary.style.display = 'none';
        return;
    }
    summary.style.display = '';
    list.innerHTML = loadingHTML;
    const lines = [];
    for (const item of cart) {
        try {
            const { product } = await api(`/api/products/${item.slug}`);
            lines.push({ ...item, product });
        } catch {
            setQty(item.slug, 0);
        }
    }
    if (!lines.length) { return renderCartPage(); }
    const itemsTotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
    const shipping = itemsTotal >= 999 || itemsTotal === 0 ? 0 : 49;
    list.innerHTML = lines.map(line => `
    <div class="line">
        <img src="${productImg(line.slug)}" alt="">
        <div>
            <div class="name">${esc(line.product.name)}</div>
            <div class="meta">${inr(line.product.price)} each</div>
            <div class="line-actions">
                <div class="qty">
                    <button data-dec="${line.slug}" aria-label="Decrease">−</button>
                    <input value="${line.qty}" readonly aria-label="Quantity">
                    <button data-inc="${line.slug}" aria-label="Increase">+</button>
                </div>
                <button class="link-danger" data-remove="${line.slug}">Remove</button>
            </div>
        </div>
        <b>${inr(line.product.price * line.qty)}</b>
    </div>`).join('');
    summary.innerHTML = `
        <h3>Order summary</h3>
        ${summaryHTML(itemsTotal, shipping)}
        <a href="/checkout" class="btn btn-primary btn-block" style="margin-top:14px">Proceed to checkout</a>
        <a href="/shop" class="btn btn-ghost btn-block" style="margin-top:10px">Continue shopping</a>`;

    $$('#cart-lines [data-inc]').forEach(b => b.onclick = () => {
        const line = lines.find(l => l.slug === b.dataset.inc);
        setQty(line.slug, Math.min(line.qty + 1, Math.min(line.product.stock, 5)));
        renderCartPage();
    });
    $$('#cart-lines [data-dec]').forEach(b => b.onclick = () => {
        const line = lines.find(l => l.slug === b.dataset.dec);
        setQty(line.slug, line.qty - 1);
        renderCartPage();
    });
    $$('#cart-lines [data-remove]').forEach(b => b.onclick = () => {
        setQty(b.dataset.remove, 0);
        renderCartPage();
    });
}

/* ---------- Checkout ---------- */
async function renderCheckoutPage() {
    const wrap = $('#checkout-root');
    const cart = readCart();
    if (!cart.length) {
        wrap.innerHTML = stateHTML('🛒', 'Nothing to check out', 'Your cart is empty.');
        return;
    }
    const lines = [];
    for (const item of cart) {
        try { lines.push({ ...item, product: (await api(`/api/products/${item.slug}`)).product }); }
        catch { setQty(item.slug, 0); }
    }
    if (!lines.length) { location.href = '/cart'; return; }
    const itemsTotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
    const shipping = itemsTotal >= 999 ? 0 : 49;

    $('#co-summary').innerHTML = `
        <h3>Order summary</h3>
        ${lines.map(line => `
        <div class="sum-row"><span>${esc(line.product.name)} × ${line.qty}</span><span>${inr(line.product.price * line.qty)}</span></div>`).join('')}
        ${summaryHTML(itemsTotal, shipping)}`;

    $('#checkout-form').addEventListener('submit', async event => {
        event.preventDefault();
        const box = $('#form-error');
        box.classList.remove('show');
        const form = new FormData(event.target);
        const payload = {
            address: {
                fullName: form.get('fullName'),
                phone: form.get('phone'),
                line1: form.get('line1'),
                line2: form.get('line2'),
                city: form.get('city'),
                state: form.get('state'),
                pin: form.get('pin')
            },
            paymentMethod: form.get('paymentMethod'),
            items: lines.map(line => ({ slug: line.slug, qty: line.qty }))
        };
        const button = $('#place-order');
        button.disabled = true;
        button.textContent = 'Placing order…';
        try {
            const { order } = await api('/api/orders', { method: 'POST', body: payload });
            localStorage.removeItem(CART_KEY);
            updateCartBadge();
            location.href = `/order/${order.id}`;
        } catch (error) {
            box.textContent = error.message;
            box.classList.add('show');
            button.disabled = false;
            button.textContent = 'Place order';
        }
    });
}

/* ---------- Order confirmation ---------- */
const STEPS = ['placed', 'processing', 'shipped', 'delivered'];
async function renderOrderPage() {
    const id = location.pathname.split('/').pop();
    const view = $('#order-view');
    view.innerHTML = loadingHTML;
    let order;
    try {
        if (/^[a-f0-9]{24}$/i.test(id)) {
            order = (await api(`/api/orders/${id}`)).order;
        } else {
            order = (await api(`/api/orders/demo/${encodeURIComponent(id)}`)).order;
        }
    } catch (error) {
        view.innerHTML = stateHTML('🧾', 'Order not found', error.message);
        return;
    }
    const index = STEPS.indexOf(order.status);
    document.title = `Order ${order.id} · ShopNest`;
    view.innerHTML = `
    <div class="card" style="padding:28px">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center">
            <div><h2 style="margin:0">Thank you${order.address ? ', ' + esc(order.address.fullName) : ''}! 🎉</h2>
            <p style="color:var(--muted);margin:6px 0 0">Order <b>${order.id}</b> is confirmed${order.demo ? ' (demo)' : ''}.</p></div>
            <a class="btn btn-ghost" href="/shop">Keep shopping</a>
        </div>
        <div class="status-track">
            ${STEPS.map((step, i) => `
            <div class="step ${i < index ? 'done' : ''} ${i === index ? 'current' : ''}">
                <div class="dot">${i < index ? '✓' : i + 1}</div>${step[0].toUpperCase() + step.slice(1)}
            </div>`).join('')}
        </div>
        <div class="cart-grid">
            <div class="order-items">
                <h3 style="margin-top:0">Items</h3>
                ${(order.items || []).map(item => `
                <div class="line">
                    <img src="${productImg(item.slug || item.product?.slug || '')}" alt="">
                    <div><div class="name">${esc(item.name)}</div><div class="meta">Qty ${item.qty} × ${inr(item.price)}</div></div>
                    <b>${inr(item.price * item.qty)}</b>
                </div>`).join('')}
            </div>
            <div>
                <h3 style="margin-top:0">Summary</h3>
                <div class="sum-row"><span>Items</span><span>${inr(order.itemsTotal)}</span></div>
                <div class="sum-row"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : inr(order.shipping)}</span></div>
                <div class="sum-row total"><span>Total</span><span>${inr(order.total)}</span></div>
                <div class="sum-row"><span>Payment</span><span>${order.paymentMethod === 'upi' ? 'UPI' : 'Cash on delivery'}</span></div>
                ${order.demo ? '<div class="free-ship-note">Demo mode — this order was simulated and is not saved.</div>' : ''}
                ${order.address ? `<h3>Shipping to</h3><p style="color:var(--muted);font-size:14px;margin:0">${esc(order.address.fullName)}<br>${esc(order.address.line1)}${order.address.line2 ? '<br>' + esc(order.address.line2) : ''}<br>${esc(order.address.city)}, ${esc(order.address.state)} ${esc(order.address.pin)}</p>` : ''}
            </div>
        </div>
    </div>`;
}

/* ---------- Account ---------- */
async function renderAccountPage() {
    const view = $('#account-view');
    view.innerHTML = loadingHTML;
    let user = null;
    try { ({ user } = await api('/api/auth/me')); } catch { /* guest */ }

    if (user) {
        view.innerHTML = `
        <div class="account-head">
            <div class="avatar">${esc(user.name[0] || 'S')}</div>
            <div><h1 style="margin:0;font-size:26px">${esc(user.name)}</h1><p style="color:var(--muted);margin:0">${esc(user.email)} · ${user.role}</p></div>
        </div>
        <div class="card" style="padding:24px">
            <h3 style="margin-top:0">Your orders</h3>
            <div id="my-orders"><div class="spinner"></div></div>
        </div>
        <button class="btn btn-ghost" id="logout-btn" style="margin-top:18px">Sign out</button>`;
        try {
            const { orders, demo } = await api('/api/orders/mine');
            $('#my-orders').innerHTML = demo
                ? stateHTML('ℹ️', 'Demo mode', 'Connect MongoDB to keep an order history (see README).')
                : orders.length ? orders.map(order => `
                <a class="line" href="/order/${order.id}" style="display:grid">
                    <div><div class="name">Order ${order.id}</div>
                    <div class="meta">${new Date(order.createdAt).toLocaleDateString('en-IN')} · ${(order.items || []).length} item(s) · ${esc(order.status)}</div></div>
                    <b>${inr(order.total)}</b>
                </a>`).join('')
                : stateHTML('📦', 'No orders yet', 'Orders you place will appear here.');
        } catch (error) {
            $('#my-orders').innerHTML = stateHTML('⚠️', 'Could not load orders', error.message);
        }
        $('#logout-btn').onclick = async () => {
            await api('/api/auth/logout', { method: 'POST' });
            toast('Signed out');
            setTimeout(() => { location.href = '/'; }, 600);
        };
        return;
    }

    view.innerHTML = `
    <div class="auth-wrap card" style="padding:28px">
        <div class="auth-tabs">
            <button id="tab-login" class="active">Sign in</button>
            <button id="tab-register">Create account</button>
        </div>
        <div class="form-error" id="auth-error"></div>
        <form id="login-form">
            <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
            <div class="field"><label>Password</label><input name="password" type="password" required minlength="8" autocomplete="current-password"></div>
            <button class="btn btn-primary btn-block">Sign in</button>
        </form>
        <form id="register-form" hidden>
            <div class="field"><label>Full name</label><input name="name" required autocomplete="name"></div>
            <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
            <div class="field"><label>Password (min 8 characters)</label><input name="password" type="password" required minlength="8" autocomplete="new-password"></div>
            <button class="btn btn-primary btn-block">Create account</button>
        </form>
        <p style="color:var(--muted);font-size:13px;margin-bottom:0">Accounts persist with MongoDB. In demo mode you can still shop and check out as a guest.</p>
    </div>`;

    const tabLogin = $('#tab-login');
    const tabRegister = $('#tab-register');
    const loginForm = $('#login-form');
    const registerForm = $('#register-form');
    tabLogin.onclick = () => { tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginForm.hidden = false; registerForm.hidden = true; };
    tabRegister.onclick = () => { tabRegister.classList.add('active'); tabLogin.classList.remove('active'); registerForm.hidden = false; loginForm.hidden = true; };

    const handleError = error => {
        const box = $('#auth-error');
        box.textContent = error.message;
        box.classList.add('show');
    };
    loginForm.onsubmit = async event => {
        event.preventDefault();
        const data = new FormData(loginForm);
        try {
            const { user: me } = await api('/api/auth/login', { method: 'POST', body: { email: data.get('email'), password: data.get('password') } });
            toast(`Welcome back, ${me.name.split(' ')[0]}!`);
            setTimeout(() => { location.href = '/account'; }, 500);
        } catch (error) { handleError(error); }
    };
    registerForm.onsubmit = async event => {
        event.preventDefault();
        const data = new FormData(registerForm);
        try {
            const { user: me } = await api('/api/auth/register', { method: 'POST', body: { name: data.get('name'), email: data.get('email'), password: data.get('password') } });
            toast(`Welcome to ShopNest, ${me.name.split(' ')[0]}!`);
            setTimeout(() => { location.href = '/account'; }, 500);
        } catch (error) { handleError(error); }
    };
}




