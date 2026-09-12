const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUsers, publicUser } = require('../controllers/authController');
const { protect } = require('../middleware/authmiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const SESSION_COOKIE = 'shopnest_session';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, {
        path: '/', httpOnly: true, sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    });
    res.json({ message: 'Signed out.' });
});
router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));
router.get('/users', protect, requireAdmin, getUsers);

module.exports = router;


