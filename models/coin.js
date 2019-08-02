'use strict';
module.exports = (sequelize, DataTypes) => {
    const Coin = sequelize.define('Coin', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING(45)
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING(3)
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE(3)
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE(3)
        }
    }, {});
    Coin.associate = function (models) {
        // associations can be defined here
    };
    return Coin;
};
