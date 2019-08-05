'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('UserItems', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            item_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Items',
                    key: 'id'
                }
            },
            user_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Users',
                    key: 'id'
                }
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
        return queryInterface.dropTable('UserItems');
    }
};
