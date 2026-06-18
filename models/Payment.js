const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true
    },
    payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    paid_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'payments',
    timestamps: false
});

module.exports = Payment;
