require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'online_store_db',
    process.env.DB_USER || 'admin',
    process.env.DB_PASSWORD || 'admin123',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        define: {
            underscored: true,
            freezeTableName: true
        }
    }
);

module.exports = sequelize;
