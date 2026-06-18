const { Op } = require('sequelize');
const { Recommendation, Product, ProductImage, Category } = require('../models');
const recommendationClient = require('./recommendationClient');

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

function formatProduct(product) {
    const plain = product.get({ plain: true });
    const firstImage = (plain.images || [])
        .map((img) => img.image_url)
        .find(Boolean);

    return {
        id: plain.id,
        title: plain.name,
        price: Number(plain.price),
        rating: Number(plain.rating),
        brand: plain.brand,
        image: firstImage || '/images/placeholder.svg',
        category: plain.Category ? plain.Category.name : null
    };
}

async function saveRecommendationsToDb(userId, items) {
    await Recommendation.destroy({ where: { user_id: userId } });

    if (!items.length) {
        return;
    }

    await Recommendation.bulkCreate(
        items.map((item) => ({
            user_id: userId,
            product_id: item.product_id,
            score: item.score
        }))
    );
}

async function loadProductsByRecommendations(items) {
    const productIds = items.map((item) => item.product_id);
    const products = await Product.findAll({
        where: {
            id: { [Op.in]: productIds },
            stock_quantity: { [Op.gt]: 0 }
        },
        include: productInclude
    });

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    return items
        .map((item) => productMap.get(Number(item.product_id)))
        .filter(Boolean)
        .map(formatProduct);
}

async function fetchAndSyncRecommendations(userId, limit = 8, regenerate = false) {
    const data = regenerate
        ? await recommendationClient.generateRecommendations(userId, limit)
        : await recommendationClient.fetchRecommendations(userId, limit);

    const items = data.recommendations || [];

    if (items.length && regenerate) {
        await saveRecommendationsToDb(userId, items);
    }

    return items;
}

module.exports = {
    saveRecommendationsToDb,
    loadProductsByRecommendations,
    fetchAndSyncRecommendations
};
