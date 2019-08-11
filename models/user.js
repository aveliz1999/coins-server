'use strict';
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER.UNSIGNED
        },
        email: {
            unique: true,
            allowNull: false,
            type: DataTypes.STRING(50)
        },
        password: {
            allowNull: false,
            type: DataTypes.CHAR(60)
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING(45)
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
    User.associate = function (models) {
        // associations can be defined here
    };
    User.prototype.get = function (key) {
        const values = Object.assign({}, this.dataValues);
        if (key && values[key]) {
            return values[key]
        }
        delete values.password;
        return values;
    };
    return User;
};
