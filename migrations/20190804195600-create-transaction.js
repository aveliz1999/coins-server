'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('Transactions', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            sender_id: {
                allowNull: true,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            receiver_id: {
                allowNull: true,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            coin_id: {
                allowNull: true,
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
            message: {
                allowNull: false,
                type: Sequelize.STRING
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
        return queryInterface.dropTable('Transactions');
    }
};
