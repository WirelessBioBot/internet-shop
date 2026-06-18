const bcrypt = require('bcrypt');
const { User, Order, OrderItem, Product, Payment, Shipment } = require('../models');
const { PAYMENT_LABELS } = require('./orderService');
const { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } = require('./adminService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

const CURRENT_ORDER_STATUSES = ['new', 'processing', 'shipped'];

const DELIVERY_STAGE_LABELS = {
    collecting: 'Собираем заказ',
    in_transit: 'Заказ в пути'
};

function formatDateRu(dateValue) {
    if (!dateValue) {
        return null;
    }

    return new Date(dateValue).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function getEstimatedDeliveryDate(createdAt) {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 3);
    return date;
}

function getDeliveryStage(orderStatus, deliveryStatus) {
    if (orderStatus === 'shipped' || deliveryStatus === 'shipped') {
        return {
            key: 'in_transit',
            label: DELIVERY_STAGE_LABELS.in_transit
        };
    }

    return {
        key: 'collecting',
        label: DELIVERY_STAGE_LABELS.collecting
    };
}

function mapOrderForProfile(order) {
    const plain = order.get({ plain: true });
    const shipment = plain.Shipment;
    const isCurrent = CURRENT_ORDER_STATUSES.includes(plain.status);
    const deliveryStage = isCurrent
        ? getDeliveryStage(plain.status, shipment?.delivery_status)
        : null;

    let deliveryDateSource = shipment?.delivery_date;
    if (!deliveryDateSource && isCurrent && plain.created_at) {
        deliveryDateSource = getEstimatedDeliveryDate(plain.created_at);
    }

    const items = (plain.items || []).map((item) => ({
        name: item.Product?.name || 'Товар',
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity
    }));

    return {
        id: plain.id,
        totalAmount: Number(plain.total_amount),
        status: plain.status,
        statusLabel: ORDER_STATUS_LABELS[plain.status] || plain.status,
        paymentStatusLabel: PAYMENT_STATUS_LABELS[plain.payment_status] || plain.payment_status,
        paymentMethod: plain.Payment
            ? (PAYMENT_LABELS[plain.Payment.payment_method] || plain.Payment.payment_method)
            : '—',
        createdAt: formatDateRu(plain.created_at),
        deliveryAddress: shipment?.delivery_address || '—',
        deliveryDate: deliveryDateSource ? formatDateRu(deliveryDateSource) : null,
        deliveryStage,
        isCurrent,
        items,
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
}

async function getUserOrders(userId) {
    const orders = await Order.findAll({
        where: { user_id: userId },
        include: [
            { model: Payment, attributes: ['payment_method', 'status'] },
            { model: Shipment },
            {
                model: OrderItem,
                as: 'items',
                include: [{ model: Product, attributes: ['id', 'name'] }]
            }
        ],
        order: [['created_at', 'DESC']]
    });

    const mapped = orders.map(mapOrderForProfile);

    return {
        currentOrders: mapped.filter((order) => order.isCurrent),
        completedOrders: mapped.filter((order) => !order.isCurrent)
    };
}

async function getProfilePageData(userId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'phone']
    });

    if (!user) {
        return null;
    }

    const orders = await getUserOrders(userId);

    return {
        user: {
            name: user.name,
            email: user.email,
            phone: user.phone || ''
        },
        ...orders
    };
}

function validateProfileUpdate(formData) {
    const errors = {};
    const values = {
        name: (formData.name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: (formData.phone || '').trim()
    };

    if (!values.name || values.name.length < 2) {
        errors.name = 'Введите имя (минимум 2 символа)';
    } else if (values.name.length > 100) {
        errors.name = 'Имя слишком длинное';
    }

    if (!values.email) {
        errors.email = 'Введите email';
    } else if (!EMAIL_REGEX.test(values.email)) {
        errors.email = 'Некорректный формат email';
    }

    if (values.phone && values.phone.length < 10) {
        errors.phone = 'Укажите корректный номер телефона';
    }

    return {
        errors,
        values,
        isValid: Object.keys(errors).length === 0
    };
}

async function updateUserProfile(userId, formData) {
    const { errors, values, isValid } = validateProfileUpdate(formData);

    if (!isValid) {
        return { success: false, errors, values };
    }

    const user = await User.findByPk(userId);

    if (!user) {
        return { success: false, errors: { form: 'Пользователь не найден' }, values };
    }

    if (values.email !== user.email) {
        const existing = await User.findOne({ where: { email: values.email } });
        if (existing) {
            return {
                success: false,
                errors: { email: 'Этот email уже используется' },
                values
            };
        }
    }

    const phoneValue = values.phone || null;

    if (phoneValue && phoneValue !== user.phone) {
        const existingPhone = await User.findOne({ where: { phone: phoneValue } });
        if (existingPhone) {
            return {
                success: false,
                errors: { phone: 'Этот телефон уже используется' },
                values
            };
        }
    }

    await user.update({
        name: values.name,
        email: values.email,
        phone: phoneValue
    });

    return { success: true, user, values };
}

function validatePasswordChange(formData) {
    const errors = {};
    const values = {};

    if (!formData.current_password) {
        errors.current_password = 'Введите текущий пароль';
    }

    if (!formData.new_password) {
        errors.new_password = 'Введите новый пароль';
    } else if (formData.new_password.length < MIN_PASSWORD_LENGTH) {
        errors.new_password = `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    }

    if (!formData.new_password_confirm) {
        errors.new_password_confirm = 'Подтвердите новый пароль';
    } else if (formData.new_password !== formData.new_password_confirm) {
        errors.new_password_confirm = 'Пароли не совпадают';
    }

    return {
        errors,
        values,
        isValid: Object.keys(errors).length === 0
    };
}

async function updateUserPassword(userId, formData) {
    const { errors, isValid } = validatePasswordChange(formData);

    if (!isValid) {
        return { success: false, errors };
    }

    const user = await User.findByPk(userId);

    if (!user) {
        return { success: false, errors: { form: 'Пользователь не найден' } };
    }

    const passwordMatch = await bcrypt.compare(formData.current_password, user.password_hash);

    if (!passwordMatch) {
        return { success: false, errors: { current_password: 'Неверный текущий пароль' } };
    }

    const passwordHash = await bcrypt.hash(formData.new_password, BCRYPT_ROUNDS);
    await user.update({ password_hash: passwordHash });

    return { success: true };
}

module.exports = {
    getProfilePageData,
    updateUserProfile,
    updateUserPassword,
    validateProfileUpdate,
    validatePasswordChange
};
