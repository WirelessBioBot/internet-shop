const express = require('express');
const router = express.Router();
const { pageTitle } = require('../config/site');
const requireAuth = require('../middleware/requireAuth');
const { PAYMENT_LABELS } = require('../services/orderService');
const {
    getOrderForPayment,
    processCardPayment,
    confirmOnlineTransfer,
    getOrderSuccessDetails,
    PAYMENT_STATUS_LABELS
} = require('../services/paymentService');

router.get('/payment/:orderId', requireAuth, async (req, res, next) => {
    try {
        const order = await getOrderForPayment(req.params.orderId, req.session.userId);

        if (!order) {
            return res.status(404).render('error', {
                title: pageTitle('Не найдено'),
                message: 'Заказ не найден или недоступен.'
            });
        }

        if (order.paymentStatus === 'paid') {
            return res.redirect(`/order/${order.id}/success`);
        }

        if (order.paymentMethod === 'cash') {
            return res.redirect(`/order/${order.id}/success`);
        }

        res.render('payment', {
            title: pageTitle('Оплата заказа'),
            order,
            paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
            errors: {},
            values: {
                card_number: '',
                card_expiry: '',
                card_cvv: '',
                card_holder: ''
            },
            flash: req.session.flash || null
        });

        delete req.session.flash;
    } catch (error) {
        next(error);
    }
});

router.post('/payment/:orderId', requireAuth, async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        const order = await getOrderForPayment(orderId, req.session.userId);

        if (!order) {
            return res.status(404).render('error', {
                title: pageTitle('Не найдено'),
                message: 'Заказ не найден.'
            });
        }

        let result;

        if (['sbp', 'online'].includes(order.paymentMethod) && req.body.confirm_transfer === '1') {
            result = await confirmOnlineTransfer(orderId, req.session.userId);
        } else {
            result = await processCardPayment(orderId, req.session.userId, req.body);
        }

        if (!result.success) {
            return res.status(400).render('payment', {
                title: pageTitle('Оплата заказа'),
                order,
                paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
                errors: result.errors || { form: result.error },
                values: result.values || {
                    card_number: req.body.card_number || '',
                    card_expiry: req.body.card_expiry || '',
                    card_cvv: req.body.card_cvv || '',
                    card_holder: req.body.card_holder || ''
                },
                flash: null
            });
        }

        req.session.flash = {
            type: 'success',
            message: 'Оплата прошла успешно.'
        };

        if (result.transactionId) {
            req.session.lastTransactionId = result.transactionId;
        }

        res.redirect(`/order/${orderId}/success`);
    } catch (error) {
        next(error);
    }
});

router.get('/order/:orderId/success', requireAuth, async (req, res, next) => {
    try {
        const order = await getOrderSuccessDetails(req.params.orderId, req.session.userId);

        if (!order) {
            return res.status(404).render('error', {
                title: pageTitle('Не найдено'),
                message: 'Заказ не найден.'
            });
        }

        const transactionId = req.session.lastTransactionId || null;
        delete req.session.lastTransactionId;

        res.render('order-success', {
            title: pageTitle('Заказ оформлен'),
            order,
            paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
            paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
            transactionId,
            flash: req.session.flash || null
        });

        delete req.session.flash;
    } catch (error) {
        next(error);
    }
});

module.exports = router;
