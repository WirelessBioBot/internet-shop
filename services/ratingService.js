const { fn, col } = require('sequelize');
const { Product, Review } = require('../models');

function roundRating(value) {
    return Math.round(Number(value) * 10) / 10;
}

async function calculateAverageRating(productId) {
    const result = await Review.findOne({
        where: { product_id: productId },
        attributes: [[fn('AVG', col('rating')), 'avgRating']],
        raw: true
    });

    if (result?.avgRating === null || result?.avgRating === undefined) {
        return 0;
    }

    return roundRating(result.avgRating);
}

async function syncProductRating(productId) {
    const rating = await calculateAverageRating(productId);

    await Product.update({ rating }, { where: { id: productId } });

    return rating;
}

async function syncAllProductRatings() {
    const products = await Product.findAll({ attributes: ['id'] });

    for (const product of products) {
        await syncProductRating(product.id);
    }
}

module.exports = {
    calculateAverageRating,
    syncProductRating,
    syncAllProductRatings
};
