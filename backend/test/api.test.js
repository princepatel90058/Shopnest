// API integration tests — run with the app in demo mode (no MongoDB needed).
process.env.MONGO_URL = '';
process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');

const app = require('../app');
const SAMPLE_PRODUCTS = require('../data/sample-products');

let server;
let base;

before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise(resolve => server.close(resolve)));

const ADDRESS = {
    fullName: 'Test User',
    phone: '9876543210',
    line1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin: '560001'
};

test('GET / serves the storefront', async () => {
    const res = await fetch(base + '/');
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /ShopNest/);
    assert.match(html, /Featured this week/);
});

test('clean URLs serve their pages', async () => {
    for (const path of ['/shop', '/cart', '/checkout', '/account', '/order/ABC123', '/product/p01']) {
        const res = await fetch(base + path);
        assert.equal(res.status, 200, path);
        assert.match(await res.text(), /ShopNest/);
    }
});

test('GET /api/health reports demo mode', async () => {
    const res = await fetch(base + '/api/health');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.mode, 'demo');
});

test('GET /api/products lists, searches and sorts', async () => {
    const all = await (await fetch(base + '/api/products')).json();
    assert.ok(all.total >= 20);
    assert.equal(all.products.length, all.total);
    for (const product of all.products) {
        assert.ok(product.name && product.slug && product.price > 0);
    }
    const search = await (await fetch(base + '/api/products?search=headphones')).json();
    assert.ok(search.products.length >= 1);
    assert.ok(search.products.every(p => /headphones/i.test(p.name + p.blurb)));
    const sorted = await (await fetch(base + '/api/products?sort=priceAsc&limit=5')).json();
    const prices = sorted.products.map(p => p.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    const limited = await (await fetch(base + '/api/products?limit=3')).json();
    assert.equal(limited.products.length, 3);
});

test('GET /api/products/meta returns categories', async () => {
    const meta = await (await fetch(base + '/api/products/meta')).json();
    assert.ok(meta.count >= 20);
    const names = meta.categories.map(c => c.name);
    assert.ok(names.includes('audio'));
    assert.ok(names.includes('home'));
});

test('GET /api/products/:slug returns a product with related items', async () => {
    const res = await fetch(base + '/api/products/pulse-anc-wireless-headphones');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.product.slug, 'pulse-anc-wireless-headphones');
    assert.ok(body.product.features.length >= 4);
    assert.ok(Array.isArray(body.related));
    assert.ok(body.related.every(item => item.category === body.product.category));
});

test('GET /api/products/:slug 404s for unknown slugs', async () => {
    const res = await fetch(base + '/api/products/no-such-product');
    assert.equal(res.status, 404);
    assert.ok((await res.json()).message);
});

test('GET /img/products/:slug.svg generates artwork', async () => {
    const res = await fetch(base + '/img/products/pulse-anc-wireless-headphones.svg');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /svg/);
    const svg = await res.text();
    assert.match(svg, /^<svg xmlns/);
    const missing = await fetch(base + '/img/products/no-such-slug.svg');
    assert.equal(missing.status, 200, 'placeholder SVG is served for unknown slugs');
});

test('POST /api/orders validates, prices and stores demo orders', async () => {
    const items = [{ slug: 'pulse-anc-wireless-headphones', qty: 1 }, { slug: 'p03', qty: 2 }];
    const createRes = await fetch(base + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: ADDRESS, items, paymentMethod: 'cod' })
    });
    const { order } = await createRes.json();
    assert.equal(createRes.status, 201);
    assert.ok(order.id);
    assert.equal(order.status, 'placed');
    assert.equal(order.demo, true);
    const expected = SAMPLE_PRODUCTS.find(p => p.slug === 'pulse-anc-wireless-headphones').price
        + SAMPLE_PRODUCTS.find(p => p.id === 'p03').price * 2;
    assert.equal(order.itemsTotal, expected);
    assert.equal(order.shipping, expected >= 999 ? 0 : 49);
    assert.equal(order.total, order.itemsTotal + order.shipping);

    const lookupRes = await fetch(base + `/api/orders/demo/${order.id}`);
    assert.equal(lookupRes.status, 200);
    const { order: fetched } = await lookupRes.json();
    assert.equal(fetched.id, order.id);
    assert.equal(fetched.address.fullName, 'Test User');
});

test('POST /api/orders rejects empty carts, bad addresses and unknown products', async () => {
    const post = body => fetch(base + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    assert.equal((await post({ address: ADDRESS, items: [] })).status, 400);
    assert.equal((await post({ address: { ...ADDRESS, pin: '12' }, items: [{ slug: 'p01', qty: 1 }] })).status, 400);
    assert.equal((await post({ address: ADDRESS, items: [{ slug: 'nope', qty: 1 }] })).status, 400);
    assert.equal((await post({ address: ADDRESS, items: [{ slug: 'p01', qty: 99 }] })).status, 400);
    assert.equal((await post({ address: ADDRESS, items: [{ slug: 'p01' }] })).status, 400);
});

test('auth endpoints explain that MongoDB is required', async () => {
    const login = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', password: 'password123' })
    });
    assert.equal(login.status, 503);
    assert.match((await login.json()).message, /MongoDB/);
    const me = await fetch(base + '/api/auth/me');
    assert.equal(me.status, 401);
});

test('unknown API routes return JSON 404s', async () => {
    const res = await fetch(base + '/api/definitely-not-a-route');
    assert.equal(res.status, 404);
    assert.ok((await res.json()).message);
});

