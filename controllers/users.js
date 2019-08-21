const Joi = require('joi');
const db = require('../models');
const Op = require('sequelize').Op;
const sequelize = db.sequelize;
const User = db.User;
const Entry = db.Entry;
const Role = db.Role;
const UserRole = db.UserRole;
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
exports.create = async function (req, res) {
    const registerSchema = Joi.object({
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
    });

    let transaction;
    try {
        const requestInfo = await registerSchema.validate(req.body);

        transaction = await sequelize.transaction();

        const user = await User.create({
            email: requestInfo.email,
            password: await encryptionUtil.bcryptHash(requestInfo.password),
            name: requestInfo.name
        }, {transaction});

        await Entry.create({
            user_id: user.id,
            coin_id: 1,
            amount: 0
        }, {transaction});

        await transaction.commit();

        await fsPromises.mkdir(`public/media/users/${user.id}`, {recursive: true});
        await fsPromises.copyFile('public/media/users/default/thumbnail.jpg', `public/media/users/${user.id}/thumbnail.jpg`);
        await fsPromises.copyFile('public/media/users/default/full.jpg', `public/media/users/${user.id}/full.jpg`);

        res.status(201).send(user);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        } else if (err.name === 'SequelizeUniqueConstraintError') {
            const error = err.errors[0];
            if (error.type === 'unique violation' && error.path === 'email') {
                if (transaction) {
                    await transaction.rollback();
                }
                return res.status(400).send({message: 'A user with that email already exists.'})
            }
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while creating your user. Please try again.'});

        if (transaction) {
            await transaction.rollback();
        }
    }
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
exports.login = async function (req, res) {
    const loginSchema = Joi.object({
        email: Joi.string()
            .email()
            .max(50)
            .required(),
        password: Joi.string()
            .min(8)
            .max(32)
            .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
            .required()
    });

    try {
        const requestInfo = await loginSchema.validate(req.body);

        const user = await User.findOne({
            where: {
                email: requestInfo.email
            }
        });
        if (!user) {
            return res.status(400).send({message: 'Incorrect email or password.'})
        }
        if (!await encryptionUtil.bcryptCompare(requestInfo.password, user.password)) {
            return res.status(400).send({message: 'Incorrect email or password.'})
        }

        req.session.user = user.id;
        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
        res.status(200).send(user);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }

        console.error(err);
        res.status(500).send({message: 'An error occurred while logging in. Please try again.'})
    }
};

/**
 * Refresh the user session and get the logged in user's information
 *
 * @param req Request object
 * @param res Response object
 */
exports.refresh = async function (req, res) {
    try {
        const user = await User.findOne({
            where: {
                id: req.session.user
            }
        });

        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
        return res.send(user);
    } catch (err) {
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
exports.getRolesFromSession = async function (req, res) {
    try {
        const roles = await UserRole.findAll({
            where: {
                user_id: req.session.user
            }
        });
        res.send(roles);
    } catch (err) {
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
exports.search = async function (req, res) {
    const searchSchema = Joi.object({
        searchTerm: Joi.string()
            .max(50)
            .required()
    });
    try {
        const {searchTerm} = await searchSchema.validate(req.params);

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    {
                        email: {
                            [Op.like]: searchTerm + "%"
                        }
                    },
                    {
                        name: {
                            [Op.like]: searchTerm + "%"
                        }
                    }
                ]
            },
            limit: 10,
            order: [['name', 'DESC']]
        });

        res.send(users);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }

        console.error(err);
        res.status(500).send({message: 'An error occurred while searching. Please try again.'});
    }
};
