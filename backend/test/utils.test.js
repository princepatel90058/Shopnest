const assert = require('node:assert/strict');
const { test } = require('node:test');

const { productSvg, placeholderSvg, logoSvg } = require('../utils/svgArt');
const { rateLimit } = require('../utils/rateLimit');
const { findByCode, save } = require('../model/DemoOrder');
const SAMPLE_PRODUCTS = require('../data/sample-products');

test('sample catalog is well-formed', () => {
    assert.ok(SAMPLE_PRODUCTS.length >= 20);
    const slugs = new Set();
    for (const product of SAMPLE_PRODUCTS) {
        assert.match(product.slug, /^[a-z0-9-]+$/, product.slug);
        assert.ok(product.price > 0);
        assert.ok(product.stock >= 0);
        assert.ok(product.features.length >= 4);
        slugs.add(product.slug);
    }
    assert.equal(slugs.size, SAMPLE_PRODUCTS.length, 'slugs must be unique');
});

test('svg artwork escapes product names', () => {
    const svg = productSvg({ name: 'A "test" <&> product', slug: 'a-test', category: 'audio', emoji: '🎧' });
    assert.ok(!svg.includes('<&>'));
    assert.ok(svg.includes('&quot;test&quot; &lt;&amp;&gt;'));
    assert.match(svg, /^<svg xmlns/);
});

test('placeholder and logo svg render', () => {
    assert.match(placeholderSvg('ShopNest'), /ShopNest/);
    assert.match(logoSvg(), /linearGradient/);
});

test('demo orders can be saved and expire', async t => {
    t.mock.timers.enable({ now: Date.now() });
    const order = { id: 'ABC123', createdAt: new Date().toISOString(), total: 500 };
    save(order);
    assert.equal(findByCode('abc123').total, 500, 'code lookup is case-insensitive');
    assert.equal(findByCode('NOPE'), null);
    t.mock.timers.tick(25 * 60 * 60 * 1000);
    assert.equal(findByCode('ABC123'), null, 'orders expire after 24h');
});

test('rate limiter blocks after max requests', () => {
    const middleware = rateLimit({ windowMs: 60000, max: 2 });
    const res = () => ({ status(code) { this.code = code; return this; }, json() { this.responded = true; } });
    const ok = { ip: '1.2.3.4' };
    middleware(ok, res(), () => {});
    middleware(ok, res(), () => {});
    const blockedRes = res();
    let nextCalled = false;
    middleware({ ip: '1.2.3.4' }, blockedRes, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(blockedRes.code, 429);
    assert.ok(blockedRes.responded);
    // A different ip is unaffected
    let otherNext = false;
    middleware({ ip: '5.6.7.8' }, res(), () => { otherNext = true; });
    assert.ok(otherNext);
});
