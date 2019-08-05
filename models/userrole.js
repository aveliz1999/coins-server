'use strict';
module.exports = (sequelize, DataTypes) => {
    const UserRole = sequelize.define('UserRole', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        user_id: {
            allowNull: false,
            type: DataTypes.INTEGER.UNSIGNED
        },
        role_id: {
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
                exclude: ['user_id', 'role_id'],
            },
            include: {
                all: true,
                nested: true
            }
        }
    });
    UserRole.associate = function (models) {
        UserRole.hasOne(models.User, {
            sourceKey: 'user_id',
            foreignKey: 'id',
            as: 'user'
        });
        UserRole.hasOne(models.Role, {
            sourceKey: 'role_id',
            foreignKey: 'id',
            as: 'role'
        });
    };
    return UserRole;
};
