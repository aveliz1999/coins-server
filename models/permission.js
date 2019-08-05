'use strict';
module.exports = (sequelize, DataTypes) => {
    const Permission = sequelize.define('Permission', {
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
        permission: {
            allowNull: false,
            type: DataTypes.ENUM([
                "EDIT_COIN_INFO",
                "DELETE_COIN",
                "ADD_ROLE",
                "EDIT_ROLES",
                "ASSIGN_ROLE",
                "ADD_ITEM",
                "DELETE_ITEM",
                "EDIT_ITEMS"
            ])
        },
        level: {
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
                exclude: ['coin_id'],
            },
            include: {
                all: true
            }
        }
    });
    Permission.associate = function (models) {
        Permission.hasOne(models.User, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        });
    };
    return Permission;
};
