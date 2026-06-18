const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductSpec = sequelize.define('ProductSpec', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    value: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'product_specs',
    timestamps: false
});

module.exports = ProductSpec;
