const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Order = require('../model/Order');
const DemoOrder = require('../model/DemoOrder');
const catalog = require('../utils/catalog');
const { isConnected } = require('../utils/mongoState');
const sendOrderConfirmation = require('../utils/sendOrderConfirmation');

const DEFAULT_SHIPPING = 49;
const FREE_SHIPPING_THRESHOLD = 999;
const MAX_QTY = 5;

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const pickString = (source, field, max) => {
    const value = source[field];
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
};

async function resolveItem(raw) {
    if (!isPlainObject(raw)) return null;
    const key = raw.slug || raw.id;
    const qty = Number(raw.qty);
    if (!key || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
    const product = await catalog.bySlugOrId(key);
    if (!product) return null;
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) return null;
    return { product, qty };
}

async function createOrder(req, res) {
    const body = isPlainObject(req.body) ? req.body : {};
    const itemsRaw = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    const source = isPlainObject(body.address) ? body.address : {};
    const address = {
        fullName: pickString(source, 'fullName', 80),
        phone: pickString(source, 'phone', 15),
        line1: pickString(source, 'line1', 160),
        line2: pickString(source, 'line2', 160),
        city: pickString(source, 'city', 60),
        state: pickString(source, 'state', 60),
        pin: pickString(source, 'pin', 6)
    };

    if (!itemsRaw.length) return res.status(400).json({ message: 'Your cart is empty. Add a product to continue.' });
    if (!address.fullName) return res.status(400).json({ message: "Please enter the recipient's full name." });
    if (!/^[0-9+\- ]{7,15}$/.test(address.phone)) return res.status(400).json({ message: 'Please enter a valid phone number.' });
    if (!address.line1) return res.status(400).json({ message: 'Please enter your street address.' });
    if (!address.city || !address.state) return res.status(400).json({ message: 'Please enter your city and state.' });
    if (!/^\d{5,6}$/.test(address.pin)) return res.status(400).json({ message: 'Please enter a valid 5–6 digit PIN code.' });
    const paymentMethod = body.paymentMethod === 'upi' ? 'upi' : 'cod';

    const resolved = [];
    for (const raw of itemsRaw) {
        const item = await resolveItem(raw);
        if (!item) {
            return res.status(400).json({ message: 'Some items are unavailable. Refresh your cart and try again.' });
        }
        resolved.push(item);
    }

    const items = resolved.map(({ product, qty }) => ({
        product: product._id || product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        qty,
        emoji: product.emoji
    }));
    const itemsTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;
    const total = itemsTotal + shipping;

    if (isConnected()) {
        const saved = await Order.create({ ...{ items, address, itemsTotal, shipping, total, paymentMethod }, user: req.user ? req.user._id : undefined });
        sendOrderConfirmation({ email: req.user && req.user.Email, id: saved.id, address, items, total })
            .catch(error => console.error('Order email failed:', error.message));
        return res.status(201).json({ order: { ...saved.toObject(), id: saved.id } });
    }

    const id = crypto.randomBytes(6).toString('hex').toUpperCase();
    const demoOrder = {
        id,
        items,
        address,
        itemsTotal,
        shipping,
        total,
        paymentMethod,
        user: req.user ? req.user.id : undefined,
        status: 'placed',
        createdAt: new Date().toISOString(),
        demo: true
    };
    DemoOrder.save(demoOrder);
    res.status(201).json({ order: demoOrder });
}

async function getOrderById(req, res) {
    if (!isConnected()) return res.status(400).json({ message: 'Saved orders need MongoDB. Set MONGO_URL in backend/.env.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found.' });
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    // Guest orders are viewable by id; user-linked orders require the matching session.
    if (order.user && (!req.user || String(order.user) !== String(req.user._id))) {
        return res.status(404).json({ message: 'Order not found. Sign in with the account used to place it.' });
    }
    res.json({ order: { ...order, id: order._id } });
}

async function getDemoOrder(req, res) {
    if (isConnected()) {
        return res.status(400).json({ message: 'Saved orders need MongoDB. Set MONGO_URL in backend/.env.' });
    }
    const order = require('../model/DemoOrder').findByCode(req.params.code);
    if (!order) return res.status(404).json({ message: 'Order not found. Orders placed in demo mode last 24 hours on this server.' });
    res.json({ order });
}

async function listMyOrders(req, res) {
    if (!isConnected()) return res.json({ orders: [], demo: true });
    const orders = await Order.find({ user: req.user._id }).sort('-createdAt').limit(50).lean();
    res.json({ orders: orders.map(order => ({ ...order, id: order._id })) });
}

async function updateStatus(req, res) {
    const allowed = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!isConnected()) return res.status(400).json({ message: 'Saved orders need MongoDB. Set MONGO_URL in backend/.env.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found.' });
    if (!allowed.includes(req.body ? req.body.status : null)) return res.status(400).json({ message: 'Invalid status.' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).lean();
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ ...order, id: order._id });
}

module.exports = { createOrder, getOrderById, getDemoOrder, listMyOrders, updateStatus };
