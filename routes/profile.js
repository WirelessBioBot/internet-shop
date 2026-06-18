const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const {
    getProfilePageData,
    updateUserProfile,
    updateUserPassword
} = require('../services/profileService');
const { setUserSession } = require('../utils/sessionUser');

async function renderProfilePage(req, res, extra = {}) {
    const data = await getProfilePageData(req.session.userId);

    if (!data) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
        return;
    }

    res.render('profile', {
        title: pageTitle('Профиль'),
        user: extra.values || data.user,
        currentOrders: data.currentOrders,
        completedOrders: data.completedOrders,
        contactErrors: extra.contactErrors || {},
        passwordErrors: extra.passwordErrors || {},
        formSection: extra.formSection || null
    });
}

router.get('/profile', requireAuth, async (req, res, next) => {
    try {
        await renderProfilePage(req, res);
    } catch (error) {
        next(error);
    }
});

router.post('/profile/contacts', requireAuth, async (req, res, next) => {
    try {
        const result = await updateUserProfile(req.session.userId, req.body);

        if (!result.success) {
            const data = await getProfilePageData(req.session.userId);
            return res.status(400).render('profile', {
                title: pageTitle('Профиль'),
                user: result.values,
                currentOrders: data?.currentOrders || [],
                completedOrders: data?.completedOrders || [],
                contactErrors: result.errors,
                passwordErrors: {},
                formSection: 'contacts'
            });
        }

        await setUserSession(req, result.user);

        req.session.flash = {
            type: 'success',
            message: 'Контактные данные обновлены'
        };

        res.redirect('/profile#contacts');
    } catch (error) {
        next(error);
    }
});

router.post('/profile/password', requireAuth, async (req, res, next) => {
    try {
        const result = await updateUserPassword(req.session.userId, req.body);

        if (!result.success) {
            const data = await getProfilePageData(req.session.userId);
            return res.status(400).render('profile', {
                title: pageTitle('Профиль'),
                user: data?.user || { name: '', email: '', phone: '' },
                currentOrders: data?.currentOrders || [],
                completedOrders: data?.completedOrders || [],
                contactErrors: {},
                passwordErrors: result.errors,
                formSection: 'password'
            });
        }

        req.session.flash = {
            type: 'success',
            message: 'Пароль успешно изменён'
        };

        res.redirect('/profile#password');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
