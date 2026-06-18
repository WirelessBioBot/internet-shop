const { Cart, CartItem, Product, ProductImage } = require('../models');

async function getCartItemsCount(userId) {
    const cart = await Cart.findOne({
        where: { user_id: userId },
        include: [{ model: CartItem, as: 'items' }]
    });

    if (!cart || !cart.items) {
        return 0;
    }

    return cart.items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0);
}

async function addProductToCart(userId, productId, quantity) {
    const product = await Product.findByPk(productId);

    if (!product) {
        const error = new Error('Товар не найден');
        error.status = 404;
        throw error;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
        const error = new Error('Некорректное количество');
        error.status = 400;
        throw error;
    }

    if (product.stock_quantity < qty) {
        const error = new Error('Недостаточно товара на складе');
        error.status = 400;
        throw error;
    }

    let cart = await Cart.findOne({ where: { user_id: userId } });
    if (!cart) {
        cart = await Cart.create({ user_id: userId });
    }

    const existingItem = await CartItem.findOne({
        where: { cart_id: cart.id, product_id: productId }
    });

    if (existingItem) {
        const newQuantity = existingItem.quantity === 0 ? qty : existingItem.quantity + qty;
        if (newQuantity > product.stock_quantity) {
            const error = new Error('Превышен доступный остаток на складе');
            error.status = 400;
            throw error;
        }
        await existingItem.update({ quantity: newQuantity });
    } else {
        await CartItem.create({
            cart_id: cart.id,
            product_id: productId,
            quantity: qty
        });
    }

    return getCartItemsCount(userId);
}

async function getUserCart(userId) {
    const cart = await Cart.findOne({
        where: { user_id: userId },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        include: [
                            {
                                model: ProductImage,
                                as: 'images',
                                attributes: ['image_url'],
                                required: false
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (!cart || !cart.items?.length) {
        return { items: [], activeItems: [], total: 0, activeQuantity: 0 };
    }

    const items = cart.items.map((item) => {
        const product = item.Product;
        const image = product?.images?.[0]?.image_url || '/images/placeholder.svg';
        const price = Number(product.price);
        const quantity = item.quantity;

        return {
            id: item.id,
            productId: product.id,
            name: product.name,
            image,
            price,
            quantity,
            stockQuantity: product.stock_quantity,
            isRemoved: quantity === 0,
            subtotal: price * quantity
        };
    });

    const activeItems = items.filter((item) => item.quantity > 0);
    const total = activeItems.reduce((sum, item) => sum + item.subtotal, 0);
    const activeQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);

    return { items, activeItems, total, activeQuantity };
}

async function findUserCartItem(userId, cartItemId) {
    return CartItem.findOne({
        where: { id: cartItemId },
        include: [
            {
                model: Cart,
                where: { user_id: userId },
                required: true
            },
            {
                model: Product
            }
        ]
    });
}

async function updateCartItemQuantity(userId, cartItemId, quantity) {
    const cartItem = await findUserCartItem(userId, cartItemId);

    if (!cartItem) {
        const error = new Error('Позиция не найдена в корзине');
        error.status = 404;
        throw error;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
        const error = new Error('Некорректное количество');
        error.status = 400;
        throw error;
    }

    if (qty > 0 && qty > cartItem.Product.stock_quantity) {
        const error = new Error('Превышен доступный остаток на складе');
        error.status = 400;
        throw error;
    }

    await cartItem.update({ quantity: qty });

    const cartCount = await getCartItemsCount(userId);
    const cart = await getUserCart(userId);

    return { cartCount, cart };
}

async function restoreCartItem(userId, cartItemId) {
    return updateCartItemQuantity(userId, cartItemId, 1);
}

async function removeCartItem(userId, cartItemId) {
    const cartItem = await findUserCartItem(userId, cartItemId);

    if (!cartItem) {
        const error = new Error('Позиция не найдена в корзине');
        error.status = 404;
        throw error;
    }

    await cartItem.destroy();

    const cartCount = await getCartItemsCount(userId);
    const cart = await getUserCart(userId);

    return { cartCount, cart };
}

module.exports = {
    getCartItemsCount,
    addProductToCart,
    getUserCart,
    updateCartItemQuantity,
    restoreCartItem,
    removeCartItem
};
