const User = require('../model/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isConnected } = require('../utils/mongoState');

const SESSION_COOKIE = 'shopnest_session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = user => ({ id: user.id, name: user.Name, email: user.Email, role: user.role });

function startSession(res, user) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    return publicUser(user);
}

function databaseRequired(res) {
    if (isConnected()) return true;
    res.status(503).json({
        message: 'Accounts and saved orders need MongoDB. Set MONGO_URL in backend/.env (see README). The demo catalog and checkout work without it.'
    });
    return false;
}

async function registerUser(req, res) {
    if (!databaseRequired(res)) return;
    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ message: 'Please enter your full name.' });
    }
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ message: 'Password must be 8–72 characters.' });
    }
    try {
        const user = await User.create({
            Name: name.trim(),
            Email: email.trim().toLowerCase(),
            Password: await bcrypt.hash(password, 12)
        });
        res.status(201).json({ user: startSession(res, user) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        throw error;
    }
}

async function loginUser(req, res) {
    if (!databaseRequired(res)) return;
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ message: 'Enter your email and password.' });
    }
    const user = await User.findOne({ Email: email.trim().toLowerCase() }).select('+Password');
    if (!user || !(await bcrypt.compare(password, user.Password))) {
        return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ user: startSession(res, user) });
}

async function getUsers(req, res) {
    if (!databaseRequired(res)) return;
    const users = await User.find({}).select('-Password').limit(200);
    res.json(users.map(publicUser));
}

module.exports = { registerUser, loginUser, getUsers, publicUser };
