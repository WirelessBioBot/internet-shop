const { User } = require('../models');

async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        req.session.flash = {
            type: 'error',
            message: 'Войдите в аккаунт администратора.'
        };
        return res.redirect(`/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }

    if (req.session.userRole === 'admin') {
        return next();
    }

    const user = await User.findByPk(req.session.userId, {
        attributes: ['id', 'role']
    });

    if (!user || user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Доступ запрещён',
            message: 'Эта страница доступна только администраторам.'
        });
    }

    req.session.userRole = user.role;
    next();
}

module.exports = requireAdmin;
