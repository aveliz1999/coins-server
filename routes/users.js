const express = require('express');
const router = express.Router();
const Joi = require('joi');
const mysql = require('../database/mysql');
const knex = require('knex');
const user = require('../database/user');
const fsPromises = require('fs').promises;
const rimraf = require('rimraf');
const encryptionUtil = require('../util/encryption');

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
    Joi.validate(req.body, registerSchema, async function (err, userInfo) {
        if (err) {
            res.status(400).send({message: err.message});
            throw err;
        }
        let connection;
        let userUuid;
        try{
            connection = await mysql.getConnection();
            await mysql.beginTransaction(connection);

            // Create the user and get their generated unique ID
            const userId = await knex('user')
                .connection(connection)
                .insert({
                    email: userInfo.email,
                    password: await encryptionUtil.bcryptHash(userInfo.password),
                    name: userInfo.name,
                    uuid: knex.raw('UUID_TO_BIN(UUID())')
                });
            userUuid = {uuid} = await knex('user')
                .connection(connection)
                .select(knex.raw('bin_to_uuid(uuid) as `uuid`'))
                .where('id', userId)
                .first();

            // Create a coin entry for the user for the default coin
            await knex('entry')
                .connection(connection)
                .insert({
                    user: userId,
                    coin: 1,
                    amount: 0
                });

            // The first user is registered, assumed to be the administrator and given owner role for default coin
            if(userId === 1) {
                await knex('role')
                    .connection(connection)
                    .insert({
                        coin: 1,
                        user: 1,
                        role_code: 1
                    });
            }

            await fsPromises.mkdir(`public/media/users/${userUuid}`, {recursive: true});
            await fsPromises.copyFile('public/media/users/default/thumbnail.jpg', `public/media/users/${userUuid}/thumbnail.jpg`);
            await fsPromises.copyFile('public/media/users/default/full.jpg',`public/media/users/${userUuid}/full.jpg`);

            await mysql.commitTransaction(connection);

            res.status(200).send({message: 'User created successfully'});
        }
        catch(err) {
            console.error(err);
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE') {
                res.status(400).send({message: 'A user with that email already exists.'})
            } else {
                res.status(500).send({message: 'An error occurred while registering. Please try again.'});
            }

            if(connection) {
                return connection.rollback(function() {
                    if(userUuid) {
                        rimraf(`../public/media/users/${userUuid}`, function() {});
                    }
                });
            }
        }
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
    const loginSchema = {
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
    Joi.validate(req.body, loginSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.comparePassword(value.email, value.password)
                .then(function (result) {
                    if (result) {
                        req.session.user = result.id;
                        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
                        res.status(200).send({userId: result.uuid});
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
 * Middleware to only allow requests that are authenticated or reply with a 403 message.
 */
router.use(function(req, res, next) {
    if(req.session.user) {
        next();
    }
    else {
        res.status(403).send({message: 'Unauthorized'});
    }
});

/**
 * Get the email, name, and UUID of the user signed in to the session
 */
router.get('/', async function(req, res) {
    try{
        const {email, name, uuid} = await user.getById(req.session.user);
        res.status(200).send({user: {email, name, uuid}});
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the user information. Please try again.'})
    }
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
                        users.filter(user => user.id !== req.session.user).map(function (user) {
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
