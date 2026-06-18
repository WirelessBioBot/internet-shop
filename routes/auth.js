const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const { registerUser, loginUser } = require('../services/authService');
const {
    requestPasswordReset,
    getResetTokenRecord,
    resetPassword
} = require('../services/passwordResetService');
const { setUserSession } = require('../utils/sessionUser');
const { triggerRecommendationRefresh } = require('../services/homeService');
const rateLimitAuth = require('../middleware/rateLimitAuth');

const authRateLimit = rateLimitAuth({
    maxAttempts: 15,
    message: 'Слишком много попыток. Попробуйте через несколько минут.',
    renderLocals: () => ({ title: 'Слишком много запросов' })
});

function getSafeReturnUrl(url) {
    if (!url || typeof url !== 'string') {
        return '/';
    }
    if (url.startsWith('/') && !url.startsWith('//')) {
        return url;
    }
    return '/';
}

function getPostAuthRedirect(user, returnUrl) {
    if (user.role === 'admin') {
        return '/admin';
    }

    return getSafeReturnUrl(returnUrl);
}

function getLoggedInRedirect(req, returnUrl) {
    if (req.session.userRole === 'admin') {
        return '/admin';
    }

    return getSafeReturnUrl(returnUrl);
}

router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect(getLoggedInRedirect(req));
    }

    res.render('register', {
        title: pageTitle('Регистрация'),
        errors: {},
        values: { name: '', email: '' }
    });
});

router.post('/register', authRateLimit, async (req, res, next) => {
    try {
        if (req.session.userId) {
            return res.redirect(getLoggedInRedirect(req));
        }

        const result = await registerUser({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.password_confirm
        });

        if (!result.success) {
            return res.status(400).render('register', {
                title: pageTitle('Регистрация'),
                errors: result.errors,
                values: result.values
            });
        }

        await setUserSession(req, result.user);
        triggerRecommendationRefresh(result.user.id);

        req.session.flash = {
            type: 'success',
            message: 'Регистрация прошла успешно. Добро пожаловать!'
        };

        res.redirect('/');
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).render('register', {
                title: pageTitle('Регистрация'),
                errors: { email: 'Пользователь с таким email уже зарегистрирован' },
                values: {
                    name: (req.body.name || '').trim(),
                    email: (req.body.email || '').trim().toLowerCase()
                }
            });
        }
        next(error);
    }
});

router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect(getLoggedInRedirect(req, req.query.returnUrl));
    }

    res.render('login', {
        title: pageTitle('Вход'),
        errors: {},
        values: { email: '' },
        returnUrl: getSafeReturnUrl(req.query.returnUrl)
    });
});

router.post('/login', authRateLimit, async (req, res, next) => {
    try {
        if (req.session.userId) {
            return res.redirect(getLoggedInRedirect(req, req.body.returnUrl));
        }

        const result = await loginUser({
            email: req.body.email,
            password: req.body.password
        });

        if (!result.success) {
            return res.status(401).render('login', {
                title: pageTitle('Вход'),
                errors: result.errors,
                values: result.values,
                returnUrl: getSafeReturnUrl(req.body.returnUrl),
                flash: null
            });
        }

        await setUserSession(req, result.user);
        triggerRecommendationRefresh(result.user.id);

        req.session.flash = {
            type: 'success',
            message: `Добро пожаловать, ${result.user.name}!`
        };

        res.redirect(getPostAuthRedirect(result.user, req.body.returnUrl));
    } catch (error) {
        next(error);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        title: pageTitle('Восстановление пароля'),
        errors: {},
        values: { email: '' },
        message: null
    });
});

router.post('/forgot-password', authRateLimit, async (req, res, next) => {
    try {
        const result = await requestPasswordReset(req.body.email);

        if (!result.success) {
            return res.status(400).render('forgot-password', {
                title: pageTitle('Восстановление пароля'),
                errors: result.errors,
                values: result.values,
                message: null
            });
        }

        res.render('forgot-password', {
            title: pageTitle('Восстановление пароля'),
            errors: {},
            values: result.values,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

router.get('/reset-password/:token', async (req, res, next) => {
    try {
        const tokenRecord = await getResetTokenRecord(req.params.token);

        if (!tokenRecord) {
            return res.status(400).render('reset-password', {
                title: pageTitle('Новый пароль'),
                errors: { form: 'Ссылка недействительна или срок её действия истёк. Запросите восстановление пароля снова.' },
                values: {},
                token: null,
                email: null
            });
        }

        res.render('reset-password', {
            title: pageTitle('Новый пароль'),
            errors: {},
            values: {},
            token: req.params.token,
            email: tokenRecord.User.email
        });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password/:token', async (req, res, next) => {
    try {
        const tokenRecord = await getResetTokenRecord(req.params.token);

        if (!tokenRecord) {
            return res.status(400).render('reset-password', {
                title: pageTitle('Новый пароль'),
                errors: { form: 'Ссылка недействительна или срок её действия истёк. Запросите восстановление пароля снова.' },
                values: {},
                token: null,
                email: null
            });
        }

        const result = await resetPassword(req.params.token, {
            password: req.body.password,
            passwordConfirm: req.body.password_confirm
        });

        if (!result.success) {
            return res.status(400).render('reset-password', {
                title: pageTitle('Новый пароль'),
                errors: result.errors,
                values: {},
                token: req.params.token,
                email: tokenRecord.User.email
            });
        }

        req.session.flash = {
            type: 'success',
            message: 'Пароль успешно изменён. Войдите с новым паролем.'
        };

        res.redirect('/login');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
