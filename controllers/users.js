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

        let userUuid;
        try {
            await mysql.db.transaction(async transaction => {
                // Create the user and get their database ID and their UUID
                const userId = await transaction('user')
                    .insert({
                        email: userInfo.email,
                        password: await encryptionUtil.bcryptHash(userInfo.password),
                        name: userInfo.name,
                        uuid: knex.raw('UUID_TO_BIN(UUID())')
                    });
                ({uuid: userUuid} = await transaction('user')
                        .select(knex.raw('bin_to_uuid(`uuid`) as `uuid`'))
                        .first()
                );

                // Create a coin entry for the user for the default coin
                await transaction('entry')
                    .insert({
                        user: userId,
                        coin: 1,
                        amount: 0
                    });

                await transaction.commit();
            });

            await fsPromises.mkdir(`public/media/users/${userUuid}`, {recursive: true});
            await fsPromises.copyFile('public/media/users/default/thumbnail.jpg', `public/media/users/${userUuid}/thumbnail.jpg`);
            await fsPromises.copyFile('public/media/users/default/full.jpg',`public/media/users/${userUuid}/full.jpg`);

            res.status(200).send({message: 'User created successfully.'});
        }
        catch(err) {
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE') {
                res.status(400).send({message: 'A user with that email already exists.'})
            } else {
                console.error(err);
                res.status(500).send({message: 'An error occurred while registering. Please try again.'});
            }

            if(userUuid) {
                rimraf(`../public/media/users/${userUuid}`, function() {});
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
            return res.status(400).send({message: err.message});
        }
        try {
            const user = await mysql.db('user')
                .select('id', 'password', knex.raw('bin_to_uuid(`uuid`) as `uuid`'))
                .where('email', userInfo.email)
                .first();
            if (!user) {
                return res.status(400).send({message: 'Incorrect username or password.'})
            }

            const {id: userId, password: storedPassword, uuid} = user;

            // Password comparison fails
            if (!await encryptionUtil.bcryptCompare(userInfo.password, storedPassword)) {
                return res.status(400).send({message: 'Incorrect username or password.'})
            }

            req.session.user = userId;
            res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
            res.status(200).send({userId: uuid});
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while logging in. Please try again.'})
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
        const {email, name, uuid} = await mysql.db('user')
            .select('email', 'name', knex.raw('bin_to_uuid(`uuid`) as `uuid`'))
            .where('id', req.session.user)
            .first() || {};
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

/**
 * Get the role name, role level, and coin UUID of the roles that are assigned to the used in session
 *
 * @param req Request object
 * @param res Response object
 */
exports.getRolesFromSession = async function(req, res) {
    try {
        // Get the coin uuid, the role name, and the role level
        const roles = await mysql.db('user_role')
            .select('role.name as role',
                'role.level',
                knex.raw('bin_to_uuid(`coin`.`uuid`) as `coin_uuid`'))
            .where('user', req.session.user)
            .join('role', 'role.id', 'user_role.role')
            .join('coin', 'coin.id', 'role.coin');
        res.status(200).send(roles);
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the user role information. Please try again.'});
    }
};

/**
 * Search for users with names that begin with the given name.
 * Returns a list of user objects without the internal ID and the user passwords.
 *
 * The name parameter must be present, and it must be under 50 characters.
 *
 * @param req Request object
 * @param res Response object
 */
exports.search = function(req, res) {
    const searchSchema = {
        searchTerm: Joi.string()
            .max(50)
            .required()
    };
    Joi.validate(req.params, searchSchema, async function (err, userInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }
        const {searchTerm} = userInfo;

        try{
            const users = await mysql.db('user')
                .select('email', 'name', knex.raw('bin_to_uuid(`uuid`) as `uuid`'))
                .where('id', '!=', req.session.user)
                .where(function() {
                    this.where('name', 'like', searchTerm + '%')
                        .orWhere('email', 'like', searchTerm + '%')
                })
                .limit(10)
                .orderBy('name', 'desc');

            res.status(200).send(users);
        }
        catch(err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while searching. Please try again.'});
        }
    });
};
