const express = require('express');
const router = express.Router();
const Joi = require('joi');
const user = require('../database/user');
const entry = require('../database/entry');
const coin = require('../database/coin');

/**
 * Register new user with information sent in a POST request to /users.
 *
 * Requires an email of max 50 characters, a password between 8 and 32 characters (that follows a specific regex), and
 * a name between 4 and 45 characters.
 */
router.post('/', function (req, res) {
    const registerSchema = {
        email: Joi.string()
            .email()
            .max(50)
            .required(),
        password: Joi.string()
            .min(8)
            .max(32)
            .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
            .required(),
        name: Joi.string()
            .min(4)
            .max(45)
            .required()
    };
    Joi.validate(req.body, registerSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.create(value.email, value.password, value.name)
                .then(function () {
                    res.status(200).send({data: 'User created successfully'});
                })
                .catch(function (err) {
                    if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE') {
                        res.status(400).send({message: 'A user with that email already exists.'})
                    } else {
                        res.status(500).send({message: 'An error occurred while creating your user. Please try again.'});
                    }
                });
        }
    });
});

/**
 * Get basic information about the logged on user.
 * User field must be set in the session to be considered logged on.
 *
 * Returns the user information (name, email, uuid) and list of coin information (coin name, symbol, uuid, and amount)
 */
router.get('/', function (req,res) {
    if(!req.session.user) {
        res.status(403).send('No access');
        return;
    }
    const toReturn = {};
    entry.getListByUser(req.session.user, 0, Number.MAX_SAFE_INTEGER)
        .then(function (entries) {
            toReturn.coins = entries.map(function(entry) {
                return {amount: entry.amount};
            });
            const coinIds = new Set(entries.map(function (entry) {
                return entry.coin;
            }));
            const promises = [];
            for(let coinId of coinIds) {
                promises.push(coin.getById(coinId));
            }
            return Promise.all(promises);
        })
        .then(function (coins) {
            for(let i = 0; i < toReturn.coins.length; i++) {
                toReturn.coins[i].name = coins[i].name;
                toReturn.coins[i].symbol = coins[i].symbol;
                toReturn.coins[i].coinId = coins[i].uuid;
            }
            return user.getById(req.session.user);
        })
        .then(function(user) {
            toReturn.user = {
                email: user.email,
                name: user.name,
                id: user.uuid
            };
            res.status(200).send(toReturn);
        })
        .catch(function (err) {
            res.status(500).send('An error has occurred. Please try again.');
            throw err;
        });
});

/**
 * Attempt to log in a user with the information sent in a POST request to /users/login.
 * If the email and password match the information in the database, the user's UUID is sent in the response and the
 * user's ID is set in their session information.
 *
 * Requires an email of max 50 characters and a password between 8 and 32 characters (that follows a specific regex).
 */
router.post('/login', function (req, res) {
    const registerSchema = {
        email: Joi.string()
            .email()
            .max(50)
            .required(),
        password: Joi.string()
            .min(8)
            .max(32)
            .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
            .required()
    };
    Joi.validate(req.body, registerSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.comparePassword(value.email, value.password)
                .then(function (result) {
                    if (result) {
                        req.session.user = result.id;
                        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
                        res.status(200).send({data: result.uuid});
                    } else {
                        res.status(400).send({message: 'Incorrect username or password.'})
                    }
                })
                .catch(function (err) {
                    if (err.message === 'User not found') {
                        res.status(400).send({message: 'Incorrect username or password.'})
                    } else {
                        console.error(err);
                        res.status(500).send({message: 'An error occurred while logging in. Please try again.'})
                    }
                });
        }
    });
});

/**
 * Search for users with names that begin with the given name.
 * Returns a list of user objects without the internal ID and the user passwords.
 *
 * The name parameter must be present, and it must be under 50 characters.
 */
router.get('/search/:name', function (req, res) {
    const searchSchema = {
        name: Joi.string()
            .max(50)
            .required()
    };
    Joi.validate(req.params, searchSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.searchByName(value.name)
                .then(function (users) {
                    res.status(200).send(
                        users.map(function (user) {
                            delete user.id;
                            delete user.password;
                            return user;
                        })
                    );
                })
                .catch(function (err) {
                    console.error(err);
                    res.status(500).send({message: 'An error occurred while searching. Please try again.'})
                });
        }
    });
});

module.exports = router;
