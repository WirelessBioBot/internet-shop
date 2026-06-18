const { sequelize, Order, Payment, User } = require('../models');

const PAYMENT_STATUS_LABELS = {
    pending: 'Ожидает оплаты',
    paid: 'Оплачен',
    failed: 'Ошибка оплаты',
    refunded: 'Возврат'
};

const DEMO_FAIL_CARD = '4000000000000002';

function normalizeCardNumber(value) {
    return (value || '').replace(/\D/g, '');
}

function validateCardPayment(formData) {
    const errors = {};
    const cardNumber = normalizeCardNumber(formData.card_number);
    const expiry = (formData.card_expiry || '').trim();
    const cvv = (formData.card_cvv || '').trim();
    const holder = (formData.card_holder || '').trim();

    if (cardNumber.length !== 16) {
        errors.card_number = 'Введите 16 цифр номера карты';
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        errors.card_expiry = 'Формат: ММ/ГГ';
    } else {
        const [month, year] = expiry.split('/').map(Number);
        if (month < 1 || month > 12) {
            errors.card_expiry = 'Некорректный месяц';
        }
    }

    if (!/^\d{3}$/.test(cvv)) {
        errors.card_cvv = 'CVV — 3 цифры';
    }

    if (holder.length < 3) {
        errors.card_holder = 'Укажите имя держателя карты';
    }

    return {
        errors,
        values: {
            card_number: formData.card_number || '',
            card_expiry: expiry,
            card_cvv: cvv,
            card_holder: holder
        },
        isValid: Object.keys(errors).length === 0,
        cardNumber
    };
}

async function getOrderForPayment(orderId, userId) {
    const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
        include: [{ model: Payment }]
    });

    if (!order) {
        return null;
    }

    const plain = order.get({ plain: true });
    const payment = plain.Payment;

    return {
        id: plain.id,
        totalAmount: Number(plain.total_amount),
        paymentStatus: plain.payment_status,
        orderStatus: plain.status,
        paymentMethod: payment?.payment_method || null,
        paymentId: payment?.id || null,
        amount: payment ? Number(payment.amount) : Number(plain.total_amount),
        paidAt: payment?.paid_at || null
    };
}

function generateTransactionId() {
    const part = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `TX-${part}-${rand}`;
}

async function markOrderPaid(orderId, userId, transactionId) {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id: orderId, user_id: userId },
            include: [{ model: Payment }],
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            await transaction.rollback();
            return { success: false, error: 'Заказ не найден' };
        }

        if (order.payment_status === 'paid') {
            await transaction.commit();
            return { success: true, alreadyPaid: true, transactionId };
        }

        const paidAt = new Date();

        await order.update({ payment_status: 'paid' }, { transaction });

        if (order.Payment) {
            await order.Payment.update({
                status: 'paid',
                paid_at: paidAt
            }, { transaction });
        }

        await transaction.commit();

        return {
            success: true,
            transactionId,
            paidAt
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function processCardPayment(orderId, userId, formData) {
    const order = await getOrderForPayment(orderId, userId);

    if (!order) {
        return { success: false, error: 'Заказ не найден' };
    }

    if (order.paymentStatus === 'paid') {
        return { success: true, redirect: true, order };
    }

    if (!['card', 'sbp', 'online'].includes(order.paymentMethod)) {
        return { success: false, error: 'Для этого заказа не требуется онлайн-оплата' };
    }

    const validation = validateCardPayment(formData);

    if (!validation.isValid) {
        return { success: false, errors: validation.errors, values: validation.values };
    }

    if (validation.cardNumber === DEMO_FAIL_CARD) {
        await Payment.update(
            { status: 'failed' },
            { where: { order_id: orderId } }
        );
        return {
            success: false,
            errors: { form: 'Платёж отклонён банком. Проверьте данные карты или используйте другую карту.' }
        };
    }

    const transactionId = generateTransactionId();
    const result = await markOrderPaid(orderId, userId, transactionId);

    return {
        success: true,
        transactionId,
        order
    };
}

async function confirmOnlineTransfer(orderId, userId) {
    const order = await getOrderForPayment(orderId, userId);

    if (!order) {
        return { success: false, error: 'Заказ не найден' };
    }

    if (!['sbp', 'online'].includes(order.paymentMethod)) {
        return { success: false, error: 'Неверный способ оплаты' };
    }

    if (order.paymentStatus === 'paid') {
        return { success: true, alreadyPaid: true };
    }

    const transactionId = generateTransactionId();
    await markOrderPaid(orderId, userId, transactionId);

    return { success: true, transactionId, order };
}

async function getOrderSuccessDetails(orderId, userId) {
    const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
        include: [
            { model: Payment },
            { model: User, attributes: ['name'] }
        ]
    });

    if (!order) {
        return null;
    }

    const plain = order.get({ plain: true });

    return {
        id: plain.id,
        totalAmount: Number(plain.total_amount),
        paymentStatus: plain.payment_status,
        paymentMethod: plain.Payment?.payment_method || null,
        contactName: plain.User?.name || '',
        paidAt: plain.Payment?.paid_at
            ? new Date(plain.Payment.paid_at).toLocaleString('ru-RU')
            : null
    };
}

module.exports = {
    PAYMENT_STATUS_LABELS,
    DEMO_FAIL_CARD,
    getOrderForPayment,
    validateCardPayment,
    processCardPayment,
    confirmOnlineTransfer,
    getOrderSuccessDetails,
    generateTransactionId
};
