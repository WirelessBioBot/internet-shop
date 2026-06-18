const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const {
    getUserCart,
    updateCartItemQuantity,
    restoreCartItem,
    removeCartItem
} = require('../services/cartService');
const { getRecommendations } = require('../services/homeService');

function filterRecommendations(recommendations, cartItems) {
    const cartProductIds = new Set(
        cartItems
            .filter((item) => item.quantity > 0)
            .map((item) => Number(item.productId))
    );

    if (!cartProductIds.size) {
        return recommendations;
    }

    return recommendations.filter((product) => !cartProductIds.has(Number(product.id)));
}

function wantsJson(req) {
    return req.xhr
        || req.headers.accept?.includes('application/json')
        || req.headers['content-type']?.includes('application/json');
}

function sendCartResponse(res, { cartCount, cart }) {
    return res.json({
        cartCount,
        total: cart.total,
        activeQuantity: cart.activeQuantity,
        items: cart.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            subtotal: item.subtotal,
            isRemoved: item.isRemoved
        }))
    });
}

router.get('/cart', requireAuth, async (req, res, next) => {
    try {
        const userId = req.session.userId;

        const [cart, recommendations] = await Promise.all([
            getUserCart(userId),
            getRecommendations(userId)
        ]);

        res.render('cart', {
            title: pageTitle('Корзина'),
            items: cart.items,
            total: cart.total,
            activeQuantity: cart.activeQuantity,
            recommendations: filterRecommendations(recommendations, cart.items)
        });
    } catch (error) {
        next(error);
    }
});

router.post('/cart/item/:id/quantity', requireAuth, async (req, res, next) => {
    try {
        const result = await updateCartItemQuantity(
            req.session.userId,
            req.params.id,
            Number(req.body.quantity)
        );

        req.session.cartCount = result.cartCount;

        if (wantsJson(req)) {
            return sendCartResponse(res, result);
        }

        res.redirect('/cart');
    } catch (error) {
        if (error.status === 400 || error.status === 404) {
            if (wantsJson(req)) {
                return res.status(error.status).json({ message: error.message });
            }
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/cart');
        }
        next(error);
    }
});

router.post('/cart/item/:id/restore', requireAuth, async (req, res, next) => {
    try {
        const result = await restoreCartItem(req.session.userId, req.params.id);

        req.session.cartCount = result.cartCount;

        if (wantsJson(req)) {
            return sendCartResponse(res, result);
        }

        res.redirect('/cart');
    } catch (error) {
        if (error.status === 400 || error.status === 404) {
            if (wantsJson(req)) {
                return res.status(error.status).json({ message: error.message });
            }
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/cart');
        }
        next(error);
    }
});

router.post('/cart/item/:id/remove', requireAuth, async (req, res, next) => {
    try {
        const result = await removeCartItem(req.session.userId, req.params.id);

        req.session.cartCount = result.cartCount;

        if (wantsJson(req)) {
            return sendCartResponse(res, result);
        }

        req.session.flash = {
            type: 'success',
            message: 'Товар удалён из корзины.'
        };

        res.redirect('/cart');
    } catch (error) {
        if (error.status === 404) {
            if (wantsJson(req)) {
                return res.status(404).json({ message: error.message });
            }
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/cart');
        }
        next(error);
    }
});

module.exports = router;
