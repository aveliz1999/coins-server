'use strict';

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const Role = require('../models').Role;

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Role.upsert({
            id: 1,
            coin_id: 1,
            name: 'Owner',
            level: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }, {})
    },

    down: (queryInterface, Sequelize) => {
        return Role.destroy({
            where: {
                id: 1
            }
        });
    }
};
