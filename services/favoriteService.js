const { Favorite, Product, ProductImage, Category, UserAction } = require('../models');
const { formatProduct } = require('./homeService');

const productInclude = [
    {
        model: ProductImage,
        as: 'images',
        required: false,
        attributes: ['image_url']
    },
    {
        model: Category,
        attributes: ['id', 'name']
    }
];

async function isProductFavorite(userId, productId) {
    if (!userId) {
        return false;
    }

    const favorite = await Favorite.findOne({
        where: {
            user_id: userId,
            product_id: productId
        }
    });

    return Boolean(favorite);
}

async function recordFavoriteAction(userId, productId) {
    await UserAction.create({
        user_id: userId,
        product_id: productId,
        action_type: 'favorite'
    });
}

async function addFavorite(userId, productId) {
    const product = await Product.findByPk(productId);

    if (!product) {
        const error = new Error('Товар не найден');
        error.status = 404;
        throw error;
    }

    const [, created] = await Favorite.findOrCreate({
        where: {
            user_id: userId,
            product_id: productId
        },
        defaults: {
            user_id: userId,
            product_id: productId
        }
    });

    if (created) {
        await recordFavoriteAction(userId, productId);
    }

    return { isFavorite: true, created };
}

async function removeFavorite(userId, productId) {
    const deleted = await Favorite.destroy({
        where: {
            user_id: userId,
            product_id: productId
        }
    });

    return { isFavorite: false, removed: deleted > 0 };
}

async function toggleFavorite(userId, productId) {
    const isFavorite = await isProductFavorite(userId, productId);

    if (isFavorite) {
        return removeFavorite(userId, productId);
    }

    return addFavorite(userId, productId);
}

async function getFavoriteProducts(userId) {
    const favorites = await Favorite.findAll({
        where: { user_id: userId },
        include: [{
            model: Product,
            required: true,
            include: productInclude
        }],
        order: [['created_at', 'DESC']]
    });

    return favorites
        .map((favorite) => favorite.Product)
        .filter(Boolean)
        .map(formatProduct);
}

async function getFavoritesCount(userId) {
    if (!userId) {
        return 0;
    }

    return Favorite.count({ where: { user_id: userId } });
}

module.exports = {
    isProductFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavoriteProducts,
    getFavoritesCount,
    recordFavoriteAction
};
