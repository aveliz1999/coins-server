'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('Roles', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            coin_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Coins',
                    key: 'id'
                }
            },
            name: {
                allowNull: false,
                type: Sequelize.STRING(32)
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
        return queryInterface.dropTable('Roles');
    }
};
