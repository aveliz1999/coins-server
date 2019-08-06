const Joi = require('joi');
const db = require('../models');
const sequelize = db.sequelize;
const Coin = db.Coin;
const Entry = db.Entry;
const Role = db.Role;
const UserRole = db.UserRole;
const Permission = db.Permission;

/**
 * Get the coin and entry data for the authenticated (in the session) user.
 * Returns an array with all the coins they owns (name, symbol, and UUID), as well as the amount in their corresponding
 * entry.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromSession = async function (req, res) {
    try {
        const entry = await Entry.findOne({
            where: {
                '$user.id$': req.session.user
            }
        });
        res.send(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred retrieving your coins. Please try again.'});
    }
};

/**
 * Get a coin's information from its UUID.
 * The uuid is sent as the request parameter labeled uuid, which must be a valid uuid that's in the database.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromId = async function (req, res) {
    const coinSchema = Joi.object({
        id: Joi.number()
            .integer()
            .positive()
            .required()
    });
    try {
        const requestInfo = await coinSchema.validate(req.params);

        const coin = await Coin.findOne({
            where: {
                id: requestInfo.id
            }
        });

        if (coin) {
            res.send(coin);
        } else {
            res.status(400).send({message: 'No coin found with that ID.'})
        }
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred retrieving the coin information. Please try again.'});
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
exports.create = async function (req, res) {
    const coinSchema = Joi.object({
        name: Joi.string()
            .required()
            .min(3)
            .max(45)
            .regex(/^[a-zA-Z0-9 ]+$/),
        symbol: Joi.string()
            .required()
            .min(1)
            .max(3)
    });

    let transaction;
    try {
        const requestInfo = await coinSchema.validate(req.body);

        transaction = await sequelize.transaction();

        const coin = await Coin.create({...requestInfo}, {transaction});
        const role = await Role.create({
            coin_id: coin.id,
            name: 'Owner',
            level: 0
        }, {transaction});
        await UserRole.create({
            user_id: req.session.user,
            role_id: role.id
        }, {transaction});

        await transaction.commit();

        return res.status(201).send(coin);

    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while creating the coin. Please try again.'});

        if (transaction) {
            await transaction.rollback();
        }
    }
};

/**
 * Update a coin with a specific UUID with the provided name and symbol.
 * The name must be a string between 3 and 45 characters that matches a specific regex.
 * The symbol must be a string between 1 and 3 characters.
 *
 * @param req Request object
 * @param res Response object
 */
exports.update = async function (req, res) {
    const coinSchema = Joi.object({
        id: Joi.number()
            .integer()
            .positive()
            .required(),
        name: Joi.string()
            .min(3)
            .max(45)
            .regex(/^[a-zA-Z0-9 ]+$/),
        symbol: Joi.string()
            .min(1)
            .max(3)
    });

    try {
        const requestInfo = await coinSchema.validate({...req.body, ...req.params});
        if (!requestInfo.name && !requestInfo.symbol) {
            return res.status(400).send({message: 'Cannot update information if nothing is provided to update.'});
        }

        let [coin, userRole, permission] = await Promise.all([
            Coin.findOne({
                where: {
                    id: requestInfo.id
                }
            }),
            UserRole.findOne({
                where: {
                    '$user.id$': req.session.user,
                    '$role.coin.id$': requestInfo.id
                }
            }),
            Permission.findOne({
                where: {
                    permission: 'EDIT_COIN_INFO',
                    '$coin.id$': requestInfo.id
                }
            })
        ]);
        if (!permission) {
            permission = {level: 0};
        }

        if (!coin) {
            return res.status(400).send({message: 'No coin found with that ID.'})
        }
        if (!userRole) {
            return res.status(400).send({message: 'You do not have permission to perform this action.'})
        }
        if (userRole.role.level > permission.level) {
            return res.status(400).send({message: 'You do not have permission to perform this action.'})
        }

        const updated = await coin.update({...req.body});

        return res.send(updated);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while updating the coin. Please try again.'});
    }
};
