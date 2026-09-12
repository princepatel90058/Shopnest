const sendEmail = require('./sendEmail');

// Best-effort order confirmation email for signed-in shoppers.
module.exports = async function sendOrderConfirmation({ email, id, address, items, total }) {
    if (!email) return false;
    const lines = (items || []).map(item => `- ${item.name} x ${item.qty} = ${item.price * item.qty}`).join('\n');
    const text = [
        `Thanks for shopping with ShopNest, ${address.fullName}!`,
        '',
        `Order ${id} - Total: Rs.${total}`,
        '',
        'Items:',
        lines,
        '',
        'Shipping to:',
        address.line1,
        address.line2,
        `${address.city}, ${address.state} ${address.pin}`
    ].filter(Boolean).join('\n');
    try {
        await sendEmail({ to: email, subject: `ShopNest order ${id} confirmed`, text });
        return true;
    } catch (error) {
        console.error('Order email failed:', error.message);
        return false;
    }
};
