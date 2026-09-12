// In-memory demo orders (used only when MongoDB is not configured).
// Orders last 24 hours so the /order confirmation page can refetch them.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const orders = new Map();

function findByCode(code) {
    const order = orders.get(String(code || '').toUpperCase());
    if (!order) return null;
    if (Date.now() - new Date(order.createdAt).getTime() > MAX_AGE_MS) {
        orders.delete(order.id);
        return null;
    }
    return order;
}

function save(order) {
    orders.set(order.id, order);
    return order;
}

module.exports = { findByCode, save };
