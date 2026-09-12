const jwt = require('jsonwebtoken');
const User = require('../model/User');

const SESSION_COOKIE = 'shopnest_session';

function readToken(req) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7);
    return req.cookies ? req.cookies[SESSION_COOKIE] : undefined;
}

async function attachUser(req, token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
}

// Requires a valid session; used by account and admin routes.
async function protect(req, res, next) {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    try {
        await attachUser(req, token);
        if (!req.user) return res.status(401).json({ message: 'Account not found. Please sign in again.' });
        next();
    } catch {
        res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
}

// Attaches the user when a valid session exists; never rejects guests.
async function optionalAuth(req, res, next) {
    const token = readToken(req);
    if (token) {
        try {
            await attachUser(req, token);
        } catch {
            // Continue as a guest.
        }
    }
    next();
}

module.exports = { protect, optionalAuth };
