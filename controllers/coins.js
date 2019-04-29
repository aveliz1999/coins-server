const mysql = require('../database/mysql');
const knex = require('knex')({client: "mysql"});
const Joi = require('joi');

/**
 * Get the coin and entry data for the authenticated (in the session) user.
 * Returns an array with all the coins they owns (name, symbol, and UUId), as well as the amount in their corresponding
 * entry.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromSession = async function(req, res) {
    let connection;
    try {
        connection = await mysql.getConnection();
        const entries = await knex('entry')
            .connection(connection)
            .select('amount', 'coin.name', 'coin.symbol', knex.raw('bin_to_uuid(`coin`.`uuid`) as `uuid`'))
            .where('user', req.session.user)
            .join('coin', 'entry.coin', 'coin.id');
        connection.release();
        res.status(200).send(entries);
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred retrieving your coins. Please try again.'});
        if(connection) {
            connection.release();
        }
    }
};

/**
 * Create a coin with the provided name and symbol.
 * The name must be a string between 3 and 45 characters that matches a specific regex.
 * The symbol must be a string between 1 and 3 characters.
 *
 * @param req Request object
 * @param res Response object
 */
exports.create = async function(req, res) {
    const transactionSchema = {
        name: Joi.string()
            .required()
            .min(3)
            .max(45)
            .regex(/^[a-zA-Z0-9 ]+$/),
        symbol: Joi.string()
            .required()
            .min(1)
            .max(3)
    };
    Joi.validate(req.body, transactionSchema, {}, async function (err, coinInfo) {
        if(err) {
            return res.status(400).send({message: err.message});
        }

        let connection;
        try {
            connection = await mysql.getConnection();
            await mysql.beginTransaction(connection);

            const coinId = (await knex('coin')
                .connection(connection)
                .insert({
                    name: coinInfo.name,
                    symbol: coinInfo.symbol,
                    uuid: knex.raw('uuid_to_bin(uuid())')
                }))[0];
            await knex('role')
                .connection(connection)
                .insert({
                    coin: coinId,
                    user: req.session.user,
                    role_code: 1
                });
            const coinUuid = (await knex('coin')
                .connection(connection)
                .select(knex.raw('bin_to_uuid(uuid) as uuid'))
                .where('id', coinId)
                .first()).uuid;

            await mysql.commitTransaction(connection);
            connection.release();

            res.status(200).send({coinUuid: coinUuid});
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while creating your coins. Please try again.'});
            return connection.rollback(function() {
                connection.release();
            });
        }
    });
};
