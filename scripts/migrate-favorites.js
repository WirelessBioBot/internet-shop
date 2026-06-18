require('dotenv').config();

const { sequelize } = require('../models');

async function main() {
    await sequelize.authenticate();

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS favorites (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            product_id BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_favorite_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_favorite_product
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            CONSTRAINT uq_user_product_favorite UNIQUE (user_id, product_id)
        )
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites(product_id)
    `);

    console.log('Таблица favorites готова');
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка миграции favorites:', error);
    process.exit(1);
});
