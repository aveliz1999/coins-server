'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('UserRoles', {
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
            role_id: {
                allowNull: false,
                type: Sequelize.INTEGER.UNSIGNED,
                references: {
                    model: 'Roles',
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
        return queryInterface.dropTable('UserRoles');
    }
};
