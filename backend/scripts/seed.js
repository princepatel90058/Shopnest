// Seeds MongoDB with the sample catalog. Usage: npm run seed (requires MONGO_URL in backend/.env)
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const Product = require('../model/Product');
const SAMPLE_PRODUCTS = require('../data/sample-products');

(async () => {
    if (!process.env.MONGO_URL) {
        console.error('Set MONGO_URL in backend/.env before seeding.');
        process.exit(1);
    }
    await connectDB();
    await Product.bulkWrite(SAMPLE_PRODUCTS.map(product => ({
        updateOne: { filter: { slug: product.slug }, update: { ...product }, upsert: true }
    })));
    console.log(`Seeded ${SAMPLE_PRODUCTS.length} products.`);
    process.exit(0);
})().catch(error => {
    console.error('Seed failed:', error.message);
    process.exit(1);
});
