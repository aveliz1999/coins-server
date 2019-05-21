const mysql = require('../database/mysql');
const knex = require('knex')({client: "mysql"});
const Joi = require('joi');

/**
 * Get the coin and entry data for the authenticated (in the session) user.
 * Returns an array with all the coins they owns (name, symbol, and UUID), as well as the amount in their corresponding
 * entry.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromSession = async function(req, res) {
    let connection;
    try {
        connection = await mysql.getConnection();
        // Get all coin (name and symbol) and the amounts owned by the user
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
 * Get a coin's information from its UUID.
 * The uuid is sent as the request parameter labeled uuid, which must be a valid uuid that's in the database.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromUuid = async function(req, res) {
    const coinSchema = {
        uuid: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required()
    };
    Joi.validate(req.params, coinSchema, async function(err, requestInfo) {
        if(err) {
            return res.status(400).send({message: err.message});
        }

        let connection;
        try {
            connection = await mysql.getConnection();

            // Get the coin (name, symbol) that matches the coin UUID requested
            const coin = await knex('coin')
                .connection(connection)
                .select('name', 'symbol')
                .where('uuid', knex.raw('uuid_to_bin(?)', [requestInfo.uuid]))
                .first();

            if(coin) {
                res.status(200).send({...coin, uuid: requestInfo.uuid});
            }
            else {
                res.status(400).send({message: 'Unknown coin UUID.'})
            }

            connection.release();
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred retrieving the coin information. Please try again.'});
            if(connection) {
                connection.release();
            }
        }
    });
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
    const coinSchema = {
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
    Joi.validate(req.body, coinSchema, async function (err, coinInfo) {
        if(err) {
            return res.status(400).send({message: err.message});
        }

        let connection;
        try {
            connection = await mysql.getConnection();
            await mysql.beginTransaction(connection);

            // Create the coin with the given information and store its id
            const coinId = (await knex('coin')
                .connection(connection)
                .insert({
                    name: coinInfo.name,
                    symbol: coinInfo.symbol,
                    uuid: knex.raw('uuid_to_bin(uuid())')
                }))[0];
            // Create an owner role for the coin that was created
            const roleId = (await knex('role')
                .connection(connection)
                .insert({
                    coin: coinId,
                    name: 'Owner',
                    level: 1
                }))[0];
            // Assign the user to the owner role
            await knex('user_role')
                .connection(connection)
                .insert({
                    user: req.session.user,
                    role: roleId
                });
            // Get the UUID of the coin
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

/**
 * Update a coin with a specific UUID with the provided name and symbol.
 * The name must be a string between 3 and 45 characters that matches a specific regex.
 * The symbol must be a string between 1 and 3 characters.
 *
 * @param req Request object
 * @param res Response object
 */
exports.update = function(req, res) {
    const coinSchema = {
        uuid: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required(),
        name: Joi.string()
            .min(3)
            .max(45)
            .regex(/^[a-zA-Z0-9 ]+$/),
        symbol: Joi.string()
            .min(1)
            .max(3)
    };
    Joi.validate({...req.body, ...req.params}, coinSchema, async function (err, coinInfo) {
        if(err) {
            return res.status(400).send({message: err.message});
        }
        if(!coinInfo.name && !coinInfo.symbol) {
            return res.status(400).send({message: 'Cannot update information if nothing is provided to update.'});
        }

        let connection;
        try {
            connection = await mysql.getConnection();
            // Get the id of the coin that matches the uuid that is being updated
            const {coinId} = (await knex('coin')
                .connection(connection)
                .select('coin.id as coinId')
                .where('uuid', knex.raw('uuid_to_bin(?)', [coinInfo.uuid]))
                .first()) || {};
            if(!coinId) {
                connection.release();
                return res.status(400).send({message: 'Unknown coin UUID'});
            }

            // Get the role level of the user trying to update the coin
            const {roleLevel} = (await knex('user_role')
                .connection(connection)
                .select('role.level as roleLevel')
                .where('user', req.session.user)
                .join('role', 'user_role.role', 'role.id')
                .first()) || {};
            // If no role level is found, the user cannot edit the coin
            if(!roleLevel) {
                connection.release();
                return res.status(400).send({message: 'You do not have permission to perform this action.'})
            }

            // Get the permission level required to update the coin information, defaulting to 1
            const editPermissionLevel = (await knex('permission')
                .connection(connection)
                .select('level')
                .where('coin', coinId)
                .where('permission', 'EDIT_COIN_INFO')
                .first()) || 1;
            // If the user's role doesn't meet the permission required level, they cannot update the coin
            if(roleLevel > editPermissionLevel) {
                connection.release();
                return res.status(400).send({message: 'You do not have permission to perform this action.'})
            }

            let query = knex('coin')
                .where('id', coinId);
            if(coinInfo.name) {
                query = query.update('name', coinInfo.name);
            }
            if(coinInfo.symbol) {
                query = query.update('symbol', coinInfo.symbol)
            }

            const result = await query.connection(connection);
            if(result === 1) {
                res.status(200).send({message: 'Coin updated successfully'});
            }
            else {
                res.status(400).send({message: 'Unknown coin UUID'})
            }

            connection.release();
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred updating the coin information. Please try again.'});
            if(connection) {
                connection.release();
            }
        }
    });
};
