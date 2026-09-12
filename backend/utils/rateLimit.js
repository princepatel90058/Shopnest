const buckets = new Map();

function sweep(now) {
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key);
    }
}

// Lightweight in-memory rate limiter for sensitive endpoints.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
    return (req, res, next) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        if (buckets.size > 5000) sweep(now);
        let bucket = buckets.get(key);
        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (bucket.count > max) {
            return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
        }
        next();
    };
}

module.exports = { rateLimit };
