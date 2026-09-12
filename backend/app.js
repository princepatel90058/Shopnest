const path = require('node:path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { mode } = require('./utils/mongoState');
const { productSvg, logoSvg, placeholderSvg } = require('./utils/svgArt');
const catalog = require('./utils/catalog');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Minimal security headers (no external dependency needed)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Tiny cookie parser (avoids an extra dependency)
app.use((req, res, next) => {
    req.cookies = Object.fromEntries(
        (req.headers.cookie || '')
            .split(';')
            .filter(part => part.includes('='))
            .map(part => {
                const i = part.indexOf('=');
                return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
            })
    );
    next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, mode: mode(), time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// Generated SVG artwork — no binary image assets required
const SVG_CACHE = 'public, max-age=86400';
app.get('/img/logo.svg', (req, res) => {
    res.type('image/svg+xml').set('Cache-Control', SVG_CACHE).send(logoSvg());
});
app.get('/img/products/:file', async (req, res, next) => {
    try {
        res.type('image/svg+xml').set('Cache-Control', SVG_CACHE);
        const match = /^([a-z0-9-]+)\.svg$/.exec(req.params.file);
        if (!match) return res.status(404).send(placeholderSvg('ShopNest'));
        const product = await catalog.bySlugOrId(match[1]);
        res.send(product ? productSvg(product) : placeholderSvg('ShopNest'));
    } catch (error) {
        next(error);
    }
});

// Clean URLs and the static storefront
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PAGES = {
    '/shop': 'shop.html',
    '/cart': 'cart.html',
    '/checkout': 'checkout.html',
    '/order': 'order.html',
    '/account': 'account.html'
};
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (PAGES[req.path]) return res.sendFile(path.join(FRONTEND_DIR, PAGES[req.path]));
    const productMatch = /^\/product\/([a-z0-9-]+)$/.exec(req.path);
    if (productMatch) return res.sendFile(path.join(FRONTEND_DIR, 'product.html'));
    const orderMatch = /^\/order\/([A-Za-z0-9-]+)$/.exec(req.path);
    if (orderMatch) return res.sendFile(path.join(FRONTEND_DIR, 'order.html'));
    next();
});
app.use(express.static(FRONTEND_DIR));
app.use((req, res) => {
    if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
        return res.status(404).sendFile(path.join(FRONTEND_DIR, 'not-found.html'));
    }
    res.status(404).send('Not found');
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    if (error && error.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid request body.' });
    }
    console.error(error);
    if (req.path.startsWith('/api')) {
        return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
    if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
        return res.status(500).sendFile(path.join(FRONTEND_DIR, 'not-found.html'));
    }
    res.status(500).send('Server error');
});

module.exports = app;
