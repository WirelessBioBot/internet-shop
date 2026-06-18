const buckets = new Map();

function cleanupBuckets(now) {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}

function rateLimitAuth({
    windowMs = 15 * 60 * 1000,
    maxAttempts = 10,
    message = 'Слишком много попыток. Попробуйте позже.',
    view = 'error',
    renderLocals = () => ({})
} = {}) {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${req.path}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
        const bucket = buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            if (buckets.size > 1000) {
                cleanupBuckets(now);
            }
            return next();
        }

        if (bucket.count >= maxAttempts) {
            const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfterSec));
            return res.status(429).render(view, {
                message,
                ...renderLocals(req)
            });
        }

        bucket.count += 1;
        next();
    };
}

module.exports = rateLimitAuth;
