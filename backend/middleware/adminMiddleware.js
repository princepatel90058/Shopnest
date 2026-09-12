// Admin gate — must run after the protect middleware.
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Admin access required.' });
};

module.exports = { requireAdmin };
