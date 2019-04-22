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
}