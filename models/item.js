'use strict';
module.exports = (sequelize, DataTypes) => {
    const Item = sequelize.define('Item', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        coin_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING(25)
        },
        cost: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE(3)
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE(3)
        }
    }, {
        defaultScope: {
            attributes: {
                exclude: ['coin_id'],
            },
            include: {
                all: true
            }
        }
    });
    Item.associate = function (models) {
        Item.hasOne(models.Coin, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        })
    };
    return Item;
};
