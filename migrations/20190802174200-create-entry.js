'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('Entries', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            user_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            coin_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Coins',
                    key: 'id'
                }
            },
            amount: {
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
        return queryInterface.dropTable('Entries');
    }
};
