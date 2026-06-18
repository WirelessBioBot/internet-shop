const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const { getUserCart } = require('../services/cartService');
const { createOrderFromCart, PAYMENT_LABELS, PAYMENT_METHODS } = require('../services/orderService');
const { User } = require('../models');
const { getCartItemsCount } = require('../services/cartService');

function getCheckoutPaymentLabels() {
    return Object.fromEntries(PAYMENT_METHODS.map((method) => [method, PAYMENT_LABELS[method]]));
}

router.get('/checkout', requireAuth, async (req, res, next) => {
    try {
        const cart = await getUserCart(req.session.userId);

        if (!cart.activeItems.length) {
            req.session.flash = {
                type: 'error',
                message: 'Корзина пуста. Добавьте товары перед оформлением заказа.'
            };
            return res.redirect('/cart');
        }

        const user = await User.findByPk(req.session.userId, {
            attributes: ['name', 'email', 'phone']
        });

        res.render('checkout', {
            title: pageTitle('Оформление заказа'),
            items: cart.activeItems,
            total: cart.total,
            errors: {},
            values: {
                contact_name: user?.name || req.session.userName || '',
                email: user?.email || req.session.userEmail || '',
                phone: user?.phone || '',
                delivery_method: 'address',
                delivery_address: '',
                cdek_point: '',
                payment_method: 'card'
            },
            paymentLabels: getCheckoutPaymentLabels()
        });
    } catch (error) {
        next(error);
    }
});

router.post('/checkout', requireAuth, async (req, res, next) => {
    try {
        const cart = await getUserCart(req.session.userId);

        if (!cart.activeItems.length) {
            req.session.flash = {
                type: 'error',
                message: 'Корзина пуста.'
            };
            return res.redirect('/cart');
        }

        const result = await createOrderFromCart(req.session.userId, req.body);

        if (!result.success) {
            return res.status(400).render('checkout', {
                title: pageTitle('Оформление заказа'),
                items: cart.activeItems,
                total: cart.total,
                errors: result.errors,
                values: result.values,
                paymentLabels: getCheckoutPaymentLabels()
            });
        }

        req.session.cartCount = await getCartItemsCount(req.session.userId);

        res.render('order-success', {
            title: pageTitle('Заказ оформлен'),
            order: result.order,
            paymentLabel: PAYMENT_LABELS[result.order.paymentMethod] || result.order.paymentMethod
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
