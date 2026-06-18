require('dotenv').config();

const { sequelize } = require('../models');
const { syncAllProductRatings } = require('../services/ratingService');

async function main() {
    await sequelize.authenticate();
    await syncAllProductRatings();
    console.log('Рейтинги товаров пересчитаны по отзывам');
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка пересчёта рейтингов:', error);
    process.exit(1);
});
