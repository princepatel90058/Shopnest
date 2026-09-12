const mongoose = require('mongoose');
const SAMPLE_PRODUCTS = require('../data/sample-products');
const Product = require('../model/Product');
const { isConnected } = require('./mongoState');

const SAMPLE_BY_SLUG = new Map(SAMPLE_PRODUCTS.map(p => [p.slug, p]));
const SAMPLE_BY_ID = new Map(SAMPLE_PRODUCTS.map(p => [p.id, p]));

const normalize = product => product && { ...product, id: product.id || product._id };

// Full catalog: real products from MongoDB when connected, otherwise the sample catalog.
async function all() {
    if (!isConnected()) return SAMPLE_PRODUCTS;
    const products = await Product.find({}).lean();
    return products.length ? products : SAMPLE_PRODUCTS;
}

async function count() {
    if (!isConnected()) return SAMPLE_PRODUCTS.length;
    const real = await Product.countDocuments();
    return real || SAMPLE_PRODUCTS.length;
}

// Fetch a product by slug or id (works for sample ids like p01 and ObjectIds).
async function bySlugOrId(key) {
    if (!key) return null;
    if (isConnected()) {
        const product = await Product.findOne({ slug: key }).lean();
        if (product) return normalize(product);
        if (mongoose.isValidObjectId(key)) {
            const byId = await Product.findById(key).lean();
            if (byId) return normalize(byId);
        }
    }
    return normalize(SAMPLE_BY_SLUG.get(key) || SAMPLE_BY_ID.get(key) || null);
}

module.exports = { all, count, bySlugOrId };
