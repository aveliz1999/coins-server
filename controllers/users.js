const Joi = require('joi');
const mysql = require('../database/mysql');
const knex = require('knex')({client: "mysql"});
const fsPromises = require('fs').promises;
const encryptionUtil = require('../util/encryption');
const rimraf = require('rimraf');

/**
 * Register new user with information sent in a POST request to /users.
 *
 * Requires an email of max 50 characters, a password between 8 and 32 characters (that follows a specific regex), and
 * a name between 4 and 45 characters.
 *
 * @param req Request object
 * @param res Response object
 */
exports.create = function (req, res) {
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
            return res.status(400).send({message: err.message});
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
            const {count: userNumber} = await knex('user')
                .connection(connection)
                .count('id as count')
                .first();
            if(userNumber === 1) {
                await knex('role')
                    .connection(connection)
                    .insert({
                        coin: 1,
                        user: userId,
                        role_code: 1
                    });
            }

            await fsPromises.mkdir(`public/media/users/${userUuid}`, {recursive: true});
            await fsPromises.copyFile('public/media/users/default/thumbnail.jpg', `public/media/users/${userUuid}/thumbnail.jpg`);
            await fsPromises.copyFile('public/media/users/default/full.jpg',`public/media/users/${userUuid}/full.jpg`);

            await mysql.commitTransaction(connection);

            res.status(200).send({message: 'User created successfully'});

            connection.release();
        }
        catch(err) {
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE') {
                res.status(400).send({message: 'A user with that email already exists.'})
            } else {
                console.error(err);
                res.status(500).send({message: 'An error occurred while registering. Please try again.'});
            }

            if(connection) {
                return connection.rollback(function() {
                    connection.release();
                    if(userUuid) {
                        rimraf(`../public/media/users/${userUuid}`, function() {});
                    }
                });
            }
        }
    });
};

/**
 * Attempt to log in a user with the information sent in a POST request to /users/login.
 * If the email and password match the information in the database, the user's UUID is sent in the response and the
 * user's ID is set in their session information.
 *
 * Requires an email of max 50 characters and a password between 8 and 32 characters (that follows a specific regex).
 *
 * @param req Request object
 * @param res Response object
 */
exports.login = function (req, res) {
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
    Joi.validate(req.body, loginSchema, async function (err, userInfo) {
        if (err) {
            res.status(400).send({message: err.message});
        }
        else {
            let connection;
            try {
                connection = await mysql.getConnection();
                const {id: userId, password: storedPassword, uuid} = await knex('user')
                    .connection(connection)
                    .select('id', 'password', knex.raw('bin_to_uuid(uuid) as uuid'))
                    .where('email', userInfo.email)
                    .first();
                if (!storedPassword) {
                    return res.status(400).send({message: 'Incorrect username or password.'})
                }

                // Password comparison fails
                if (!encryptionUtil.bcryptCompare(userInfo.password, storedPassword)) {
                    return res.status(400).send({message: 'Incorrect username or password.'})
                }

                req.session.user = userId;
                res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
                res.status(200).send({userId: uuid});

                connection.release();
            }
            catch(err) {
                console.error(err);
                res.status(500).send({message: 'An error occurred while logging in. Please try again.'})

                if(connection) {
                    connection.release();
                }
            }
        }
    });
};

/**
 * Get the email, name, and unique ID of the user with a signed in session
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromSession = async function (req, res) {
    try {
        const {email, name, uuid} = await knex('user')
            .select('email', 'name', knex.raw('bin_to_uuid(uuid) as uuid'))
            .where('id', req.session.user)
            .first();
        if(uuid) {
            res.status(200).send({email, name, uuid});
        }
        else{
            // Delete the session's user information if the query returns no information for it
            delete req.session.user;
            res.status(400).send({message: 'Unknown user'});
        }
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the user information. Please try again.'})
    }
};

exports.search = function(req, res) {
    const searchSchema = {
        name: Joi.string()
            .max(50)
            .required()
    };
    Joi.validate(req.params, searchSchema, async function (err, userInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }
        let connection;
        try{
            connection = await mysql.getConnection();

            const users = await knex('user')
                .connection(connection)
                .select('email', 'name', knex.raw('bin_to_uuid(uuid) as uuid'))
                .where('name', 'like', userInfo.name + '%')
                .limit(10);

            res.status(200).send(users);
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while searching. Please try again.'})
        }
    });
};