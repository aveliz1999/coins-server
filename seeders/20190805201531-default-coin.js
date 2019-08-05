'use strict';

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const Coin = require('../models').Coin;

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Coin.upsert({
            id: 1,
            name: config.defaultCoin.name,
            symbol: config.defaultCoin.symbol,
            createdAt: new Date(),
            updatedAt: new Date()
        }, {})
    },

    down: (queryInterface, Sequelize) => {
        return Coin.destroy({
            where: {
                id: 1
            }
        });
    }
};
