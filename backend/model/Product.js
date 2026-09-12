const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9-]+$/ },
    brand: { type: String, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    category: { type: String, required: true, lowercase: true, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 4.3 },
    reviews: { type: Number, min: 0, default: 0 },
    badge: { type: String, maxlength: 30 },
    blurb: { type: String, maxlength: 300 },
    stock: { type: Number, required: true, min: 0 },
    features: [{ type: String, maxlength: 80 }],
    emoji: { type: String, maxlength: 12 },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
