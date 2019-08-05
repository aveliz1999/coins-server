'use strict';
module.exports = (sequelize, DataTypes) => {
    const Entry = sequelize.define('Entry', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        user_id: {
            allowNull: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        coin_id: {
            allowNull: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        amount: {
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
                exclude: ['user_id', 'coin_id'],
            },
            include: {
                all: true
            }
        }
    });
    Entry.associate = function (models) {
        Entry.hasOne(models.User, {
            sourceKey: 'user_id',
            foreignKey: 'id',
            as: 'user'
        });
        Entry.hasOne(models.Coin, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        })
    };
    return Entry;
};
