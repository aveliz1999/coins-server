'use strict';
module.exports = (sequelize, DataTypes) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        sender_id: {
            allowNull: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        receiver_id: {
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
        message: {
            allowNull: false,
            type: DataTypes.STRING
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
    Transaction.associate = function (models) {
        Transaction.hasOne(models.User, {
            sourceKey: 'sender_id',
            foreignKey: 'id',
            as: 'sender'
        });
        Transaction.hasOne(models.User, {
            sourceKey: 'receiver_id',
            foreignKey: 'id',
            as: 'receiver'
        });
        Transaction.hasOne(models.Coin, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        });
    };
    return Transaction;
};
