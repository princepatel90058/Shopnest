const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, match: /^[0-9+\- ]{7,15}$/ },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    pin: { type: String, required: true, trim: true, match: /^\d{5,6}$/ }
}, { _id: false });

const itemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: String,
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    emoji: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [itemSchema],
    address: addressSchema,
    itemsTotal: Number,
    shipping: Number,
    total: Number,
    paymentMethod: String,
    status: {
        type: String,
        enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'placed'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
