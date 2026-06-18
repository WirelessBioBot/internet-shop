const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const {
    toggleFavorite,
    getFavoriteProducts
} = require('../services/favoriteService');
const { triggerRecommendationRefresh } = require('../services/homeService');

function resolveReturnUrl(req, fallback) {
    const returnUrl = (req.body.returnUrl || req.query.returnUrl || '').trim();

    if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        return returnUrl;
    }

    return fallback;
}

router.get('/favorites', requireAuth, async (req, res, next) => {
    try {
        const products = await getFavoriteProducts(req.session.userId);

        res.render('favorites', {
            title: pageTitle('Избранное'),
            products,
            cartCount: req.session.cartCount || 0
        });
    } catch (error) {
        next(error);
    }
});

router.post('/product/:id/favorite', requireAuth, async (req, res, next) => {
    try {
        const productId = req.params.id;
        const returnUrl = resolveReturnUrl(req, `/product/${productId}`);

        const result = await toggleFavorite(req.session.userId, productId);
        triggerRecommendationRefresh(req.session.userId);

        req.session.flash = {
            type: 'success',
            message: result.isFavorite
                ? 'Товар добавлен в избранное.'
                : 'Товар удалён из избранного.'
        };

        res.redirect(returnUrl);
    } catch (error) {
        if (error.status === 404) {
            req.session.flash = {
                type: 'error',
                message: error.message
            };
            return res.redirect(resolveReturnUrl(req, '/catalog'));
        }

        next(error);
    }
});

module.exports = router;
