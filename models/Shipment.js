const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shipment = sequelize.define('Shipment', {
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
    delivery_address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tracking_number: {
        type: DataTypes.STRING(100),
        unique: true
    },
    delivery_status: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    delivery_date: {
        type: DataTypes.DATEONLY
    }
}, {
    tableName: 'shipments',
    timestamps: false
});

module.exports = Shipment;
