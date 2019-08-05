'use strict';
module.exports = (sequelize, DataTypes) => {
    const Request = sequelize.define('Request', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        sender_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        receiver_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        coin_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        amount: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        message: {
            allowNull: false,
            type: DataTypes.STRING(64)
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
                exclude: ['sender_id', 'receiver_id', 'coin_id'],
            },
            include: {
                all: true
            }
        }
    });
    Request.associate = function (models) {
        Request.hasOne(models.User, {
            sourceKey: 'sender_id',
            foreignKey: 'id',
            as: 'sender'
        });
        Request.hasOne(models.User, {
            sourceKey: 'receiver_id',
            foreignKey: 'id',
            as: 'receiver'
        });
        Request.hasOne(models.Coin, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        });
    };
    return Request;
};
