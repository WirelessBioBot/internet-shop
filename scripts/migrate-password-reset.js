require('dotenv').config();

const { sequelize } = require('../models');

async function main() {
    await sequelize.authenticate();

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_reset_token_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
        ON password_reset_tokens(user_id)
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
        ON password_reset_tokens(expires_at)
    `);

    console.log('Таблица password_reset_tokens готова');
    process.exit(0);
}

main().catch((error) => {
    console.error('Ошибка миграции password_reset_tokens:', error);
    process.exit(1);
});
