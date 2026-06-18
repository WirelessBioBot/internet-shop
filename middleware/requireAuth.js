function requireAuth(req, res, next) {
    if (!req.session.userId) {
        req.session.flash = {
            type: 'error',
            message: 'Войдите в аккаунт для доступа к этому разделу.'
        };
        return res.redirect(`/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }
    next();
}

module.exports = requireAuth;
