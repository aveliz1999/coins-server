'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('Permissions', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            coin_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED
            },
            permission: {
                allowNull: false,
                type: Sequelize.ENUM([
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
                type: Sequelize.INTEGER.UNSIGNED
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE(3)
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE(3)
            }
        });
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('Permissions');
    }
};
