const { sequelize, Cart, CartItem, Product, Order, OrderItem, Payment, Shipment, User, UserAction } = require('../models');
const { triggerRecommendationRefresh } = require('./homeService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_METHODS = ['card', 'cash', 'sbp'];
const DELIVERY_METHODS = ['address', 'cdek'];

function buildDeliveryAddress(values) {
    if (values.delivery_method === 'cdek') {
        return `Пункт выдачи СДЕК: ${values.cdek_point}`;
    }

    return values.delivery_address;
}

function validateCheckoutForm(formData) {
    const errors = {};
    const values = {
        contact_name: (formData.contact_name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: (formData.phone || '').trim(),
        delivery_method: (formData.delivery_method || 'address').trim(),
        delivery_address: (formData.delivery_address || '').trim(),
        cdek_point: (formData.cdek_point || '').trim(),
        payment_method: (formData.payment_method || '').trim()
    };

    if (!values.contact_name || values.contact_name.length < 2) {
        errors.contact_name = 'Введите имя (минимум 2 символа)';
    }

    if (!values.email) {
        errors.email = 'Введите email';
    } else if (!EMAIL_REGEX.test(values.email)) {
        errors.email = 'Некорректный формат email';
    }

    if (!values.phone) {
        errors.phone = 'Введите телефон';
    } else if (values.phone.length < 10) {
        errors.phone = 'Укажите корректный номер телефона';
    }

    if (!DELIVERY_METHODS.includes(values.delivery_method)) {
        errors.delivery_method = 'Выберите способ доставки';
    } else if (values.delivery_method === 'address') {
        if (!values.delivery_address || values.delivery_address.length < 10) {
            errors.delivery_address = 'Укажите полный адрес доставки';
        }
    } else if (!values.cdek_point || values.cdek_point.length < 5) {
        errors.cdek_point = 'Укажите пункт выдачи СДЕК';
    }

    if (!PAYMENT_METHODS.includes(values.payment_method)) {
        errors.payment_method = 'Выберите способ оплаты';
    }

    values.resolved_delivery_address = buildDeliveryAddress(values);

    return {
        errors,
        values,
        isValid: Object.keys(errors).length === 0
    };
}

async function getCartForOrder(userId, transaction) {
    return Cart.findOne({
        where: { user_id: userId },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [{ model: Product }]
            }
        ],
        transaction
    });
}

async function createOrderFromCart(userId, formData) {
    const { errors, values, isValid } = validateCheckoutForm(formData);

    if (!isValid) {
        return { success: false, errors, values };
    }

    const transaction = await sequelize.transaction();

    try {
        const cart = await getCartForOrder(userId, transaction);

        if (!cart || !cart.items?.length) {
            await transaction.rollback();
            return {
                success: false,
                errors: { form: 'Корзина пуста. Добавьте товары перед оформлением.' },
                values
            };
        }

        const activeItems = cart.items.filter((item) => item.quantity > 0);

        if (!activeItems.length) {
            await transaction.rollback();
            return {
                success: false,
                errors: { form: 'Корзина пуста. Добавьте товары перед оформлением.' },
                values
            };
        }

        let totalAmount = 0;
        const orderLines = [];

        for (const item of activeItems) {
            const product = item.Product;

            if (!product) {
                throw new Error('Товар в корзине не найден');
            }

            if (product.stock_quantity < item.quantity) {
                await transaction.rollback();
                return {
                    success: false,
                    errors: {
                        form: `Недостаточно товара «${product.name}» на складе (доступно: ${product.stock_quantity})`
                    },
                    values
                };
            }

            const price = Number(product.price);
            totalAmount += price * item.quantity;

            orderLines.push({
                product,
                quantity: item.quantity,
                price
            });
        }

        const order = await Order.create({
            user_id: userId,
            status: 'new',
            total_amount: totalAmount,
            payment_status: 'pending'
        }, { transaction });

        for (const line of orderLines) {
            await OrderItem.create({
                order_id: order.id,
                product_id: line.product.id,
                quantity: line.quantity,
                price: line.price
            }, { transaction });

            await Product.update(
                { stock_quantity: line.product.stock_quantity - line.quantity },
                { where: { id: line.product.id }, transaction }
            );

            await UserAction.create({
                user_id: userId,
                product_id: line.product.id,
                action_type: 'purchase'
            }, { transaction });
        }

        await Payment.create({
            order_id: order.id,
            payment_method: values.payment_method,
            amount: totalAmount,
            status: 'pending'
        }, { transaction });

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);

        await Shipment.create({
            order_id: order.id,
            delivery_address: values.resolved_delivery_address,
            delivery_status: 'pending',
            delivery_date: deliveryDate.toISOString().slice(0, 10)
        }, { transaction });

        try {
            await User.update(
                { phone: values.phone },
                { where: { id: userId }, transaction }
            );
        } catch (updateError) {
            if (updateError.name !== 'SequelizeUniqueConstraintError') {
                throw updateError;
            }
        }

        await CartItem.destroy({
            where: { cart_id: cart.id },
            transaction
        });

        await transaction.commit();

        triggerRecommendationRefresh(userId);

        return {
            success: true,
            order: {
                id: order.id,
                totalAmount,
                paymentMethod: values.payment_method,
                contactName: values.contact_name
            }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

const PAYMENT_LABELS = {
    card: 'Банковская карта',
    cash: 'Наличными при получении',
    sbp: 'СБП',
    online: 'СБП'
};

module.exports = {
    validateCheckoutForm,
    createOrderFromCart,
    PAYMENT_METHODS,
    DELIVERY_METHODS,
    PAYMENT_LABELS
};
