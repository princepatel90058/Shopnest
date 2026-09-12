const catalog = require('../utils/catalog');

const offPct = p => (p.mrp && p.mrp > p.price) ? 1 - p.price / p.mrp : 0;

const SORTERS = {
    featured: (a, b) => Number(b.featured === true) - Number(a.featured === true) || b.rating - a.rating,
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => offPct(b) - offPct(a) || b.rating - a.rating
};

async function listProducts(req, res) {
    let products = await catalog.all();
    const category = String(req.query.category || '').toLowerCase();
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = Number.parseInt(req.query.limit, 10);

    if (category && category !== 'all') products = products.filter(p => p.category === category);
    if (search) {
        products = products.filter(p =>
            [p.name, p.brand, p.blurb, p.category].some(value => value && value.toLowerCase().includes(search)));
    }
    products = [...products].sort(SORTERS[req.query.sort] || SORTERS.featured);

    const total = products.length;
    if (Number.isFinite(limit) && limit > 0) products = products.slice(0, Math.min(limit, 100));
    res.json({ total, count: products.length, products });
}

async function getProduct(req, res) {
    const product = await catalog.bySlugOrId(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    const related = (await catalog.all())
        .filter(p => p.category === product.category && (p.id || p._id) !== (product.id || product._id))
        .slice(0, 4);
    res.json({ product, related });
}

async function getMeta(req, res) {
    const products = await catalog.all();
    const categories = [...new Set(products.map(p => p.category))].sort()
        .map(name => ({ name, count: products.filter(p => p.category === name).length }));
    res.json({ categories, count: products.length });
}

module.exports = { listProducts, getProduct, getMeta };
