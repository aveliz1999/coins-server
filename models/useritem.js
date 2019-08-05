'use strict';
module.exports = (sequelize, DataTypes) => {
    const UserItem = sequelize.define('UserItem', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        item_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        user_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE
        }
    }, {
        defaultScope: {
            attributes: {
                exclude: ['item_id', 'user_id'],
            },
            include: {
                all: true,
                nested: true
            }
        }
    });
    UserItem.associate = function (models) {
        UserItem.hasOne(models.Item, {
            sourceKey: 'item_id',
            foreignKey: 'id',
            as: 'item'
        });
        UserItem.hasOne(models.User, {
            sourceKey: 'user_id',
            foreignKey: 'id',
            as: 'user'
        });
    };
    return UserItem;
};
