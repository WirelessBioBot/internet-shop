require('dotenv').config();

const { sequelize } = require('../models');

async function main() {
    await sequelize.authenticate();

    await sequelize.query(`
        ALTER TABLE cart_items
        DROP CONSTRAINT IF EXISTS chk_cartitem_quantity
    `);

    await sequelize.query(`
        ALTER TABLE cart_items
        ADD CONSTRAINT chk_cartitem_quantity CHECK (quantity >= 0)
    `);

    console.log('Ограничение cart_items обновлено: quantity >= 0');
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка миграции корзины:', error);
    process.exit(1);
});
