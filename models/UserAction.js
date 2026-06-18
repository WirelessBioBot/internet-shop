const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAction = sequelize.define('UserAction', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    action_type: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    action_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user_actions',
    timestamps: false
});

module.exports = UserAction;
