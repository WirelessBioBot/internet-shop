const { Op } = require('sequelize');
const {
    User,
    Product,
    Order,
    OrderItem,
    Payment,
    Shipment
} = require('../models');

const ORDER_STATUSES = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const ACTIVE_ORDER_STATUSES = ['new', 'processing', 'shipped'];
const COMPLETED_ORDER_STATUSES = ['delivered', 'cancelled'];

const ORDER_STATUS_LABELS = {
    new: 'Новый',
    processing: 'В обработке',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменён'
};

const PAYMENT_STATUS_LABELS = {
    pending: 'Ожидает оплаты',
    paid: 'Оплачен',
    failed: 'Ошибка',
    refunded: 'Возврат'
};

async function getDashboardStats() {
    const [
        usersCount,
        productsCount,
        ordersCount,
        revenueResult,
        pendingOrdersCount,
        lowStockCount
    ] = await Promise.all([
        User.count(),
        Product.count(),
        Order.count(),
        Order.sum('total_amount'),
        Order.count({ where: { status: 'new' } }),
        Product.count({ where: { stock_quantity: { [Op.lte]: 5 } } })
    ]);

    return {
        usersCount,
        productsCount,
        ordersCount,
        totalRevenue: Number(revenueResult) || 0,
        pendingOrdersCount,
        lowStockCount
    };
}

async function getRecentOrders(limit = 15) {
    return getOrdersList({}, { scope: 'all', limit });
}

function mapOrderForAdmin(order) {
    const plain = order.get({ plain: true });

    return {
        id: plain.id,
        customerName: plain.User ? plain.User.name : '—',
        customerEmail: plain.User ? plain.User.email : '—',
        totalAmount: Number(plain.total_amount),
        status: plain.status,
        statusLabel: ORDER_STATUS_LABELS[plain.status] || plain.status,
        paymentStatus: plain.payment_status,
        paymentStatusLabel: PAYMENT_STATUS_LABELS[plain.payment_status] || plain.payment_status,
        paymentMethod: plain.Payment ? plain.Payment.payment_method : '—',
        createdAt: plain.created_at
            ? new Date(plain.created_at).toLocaleString('ru-RU')
            : '—',
        isCompleted: COMPLETED_ORDER_STATUSES.includes(plain.status)
    };
}

function buildOrderWhere(filters, scope) {
    const where = {};

    if (filters.orderStatus && ORDER_STATUSES.includes(filters.orderStatus)) {
        if (scope === 'active' && COMPLETED_ORDER_STATUSES.includes(filters.orderStatus)) {
            where.id = -1;
        } else if (scope === 'completed' && ACTIVE_ORDER_STATUSES.includes(filters.orderStatus)) {
            where.id = -1;
        } else {
            where.status = filters.orderStatus;
        }
    } else if (scope === 'active') {
        where.status = { [Op.in]: ACTIVE_ORDER_STATUSES };
    } else if (scope === 'completed') {
        where.status = { [Op.in]: COMPLETED_ORDER_STATUSES };
    }

    if (filters.orderPayment && PAYMENT_STATUSES.includes(filters.orderPayment)) {
        where.payment_status = filters.orderPayment;
    }

    if (filters.orderQ && /^\d+$/.test(filters.orderQ)) {
        where.id = Number(filters.orderQ);
    }

    return where;
}

function buildOrderInclude(filters) {
    const includes = [
        {
            model: Payment,
            attributes: ['payment_method', 'status']
        }
    ];

    const userInclude = {
        model: User,
        attributes: ['id', 'name', 'email']
    };

    if (filters.orderQ && !/^\d+$/.test(filters.orderQ)) {
        userInclude.required = true;
        userInclude.where = {
            [Op.or]: [
                { name: { [Op.iLike]: `%${filters.orderQ}%` } },
                { email: { [Op.iLike]: `%${filters.orderQ}%` } }
            ]
        };
    }

    includes.unshift(userInclude);
    return includes;
}

async function getOrdersList(filters = {}, { scope = 'all', limit = 100 } = {}) {
    if (scope === 'all') {
        const orders = await Order.findAll({
            include: buildOrderInclude(filters),
            where: buildOrderWhere(filters, null),
            order: [['created_at', 'DESC']],
            limit
        });

        return orders.map(mapOrderForAdmin);
    }

    const orders = await Order.findAll({
        include: buildOrderInclude(filters),
        where: buildOrderWhere(filters, scope),
        order: [['created_at', 'DESC']],
        limit
    });

    return orders.map(mapOrderForAdmin);
}

async function getActiveOrders(filters = {}, limit = 100) {
    return getOrdersList(filters, { scope: 'active', limit });
}

async function getCompletedOrders(filters = {}, limit = 100) {
    return getOrdersList(filters, { scope: 'completed', limit });
}

async function getUsersList(filters = {}, limit = 100) {
    const where = {};

    if (filters.userRole && ['user', 'admin'].includes(filters.userRole)) {
        where.role = filters.userRole;
    }

    if (filters.userQ) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${filters.userQ}%` } },
            { email: { [Op.iLike]: `%${filters.userQ}%` } },
            { phone: { [Op.iLike]: `%${filters.userQ}%` } }
        ];
    }

    const users = await User.findAll({
        where,
        attributes: ['id', 'name', 'email', 'phone', 'role', 'created_at'],
        order: [['created_at', 'DESC']],
        limit
    });

    return users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '—',
        role: user.role,
        createdAt: user.created_at
            ? new Date(user.created_at).toLocaleDateString('ru-RU')
            : '—'
    }));
}

async function updateOrderStatus(orderId, status) {
    if (!ORDER_STATUSES.includes(status)) {
        const error = new Error('Недопустимый статус заказа');
        error.status = 400;
        throw error;
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
        const error = new Error('Заказ не найден');
        error.status = 404;
        throw error;
    }

    await order.update({ status });

    if (status === 'shipped' || status === 'delivered') {
        const shipment = await Shipment.findOne({ where: { order_id: orderId } });
        if (shipment) {
            const deliveryStatus = status === 'delivered' ? 'delivered' : 'shipped';
            await shipment.update({ delivery_status: deliveryStatus });
        }
    }

    return order;
}

async function updateOrderPaymentStatus(orderId, paymentStatus) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        const error = new Error('Недопустимый статус оплаты');
        error.status = 400;
        throw error;
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
        const error = new Error('Заказ не найден');
        error.status = 404;
        throw error;
    }

    await order.update({ payment_status: paymentStatus });

    const payment = await Payment.findOne({ where: { order_id: orderId } });
    if (payment) {
        await payment.update({
            status: paymentStatus,
            paid_at: paymentStatus === 'paid' ? new Date() : null
        });
    }

    return order;
}

module.exports = {
    getDashboardStats,
    getRecentOrders,
    getOrdersList,
    getActiveOrders,
    getCompletedOrders,
    getUsersList,
    updateOrderStatus,
    updateOrderPaymentStatus,
    ORDER_STATUSES,
    PAYMENT_STATUSES,
    ACTIVE_ORDER_STATUSES,
    COMPLETED_ORDER_STATUSES,
    ORDER_STATUS_LABELS,
    PAYMENT_STATUS_LABELS
};
