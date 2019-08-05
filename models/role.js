'use strict';
module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
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
            type: DataTypes.STRING(32)
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
    Role.associate = function (models) {
        Role.hasOne(models.Coin, {
            sourceKey: 'coin_id',
            foreignKey: 'id',
            as: 'coin'
        });
    };
    return Role;
};
