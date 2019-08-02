'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('Coins', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            name: {
                type: Sequelize.STRING(45),
                allowNull: false
            },
            symbol: {
                type: Sequelize.STRING(3),
                allowNull: false
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
        return queryInterface.dropTable('Coins');
    }
};
