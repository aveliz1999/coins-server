const mysql = require('./mysql');
const bcrypt = require('bcrypt');

/**
 * Amount of rounds when generating a password salt
 *
 * @type {number}
 */
const SALT_ROUNDS = 10;

/**
 * Get a user by their ID
 *
 * @param {Number} id The integer ID to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the user data if it's successful
 */
exports.getById = function(id, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT id, email, password, name, BIN_TO_UUID(uuid) AS uuid FROM `user` WHERE `id` = ?', [id], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('User not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a user by their UUID
 *
 * @param {String} uuid The UUID string to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the user data if it's successful
 */
exports.getByUuid = function(uuid, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT id, email, password, name, BIN_TO_UUID(uuid) AS uuid FROM `user` WHERE `uuid` = UUID_TO_BIN(?)', [uuid], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('User not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a user by their email
 *
 * @param {String} email The email string to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of user data if it's successful
 */
exports.getListByEmail = function(email, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT id, email, password, name, BIN_TO_UUID(uuid) AS uuid FROM `user` WHERE `email` = ?', [email], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('User not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of users by their name
 *
 * @param {String} name The name string to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "name"
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of user data if it's successful
 */
exports.getListByName = function(name, previousId = 0, limit = 10, orderBy = 'name', connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        let query;
        let parameters;
        if(previousId === 0){
            query = 'SELECT id, email, password, name, BIN_TO_UUID(uuid) AS uuid FROM `user` WHERE `name` = ? ORDER BY ? LIMIT ?';
            parameters = [name, orderBy, limit];
        }
        else{
            query = 'SELECT id, email, password, name, BIN_TO_UUID(uuid) AS uuid FROM `user` WHERE `id` > ? AND `name` = ? ORDER BY ? LIMIT ?';
            parameters = [previousId, name, orderBy, limit];
        }
        connection.query(query, parameters, function(err, rows, fields) {
            if(err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Create a new user with the given information
 *
 * @param {String} email The email to use for the user. Must be unique or it returns an error
 * @param {String} password The password to use for the user
 * @param {String} name The name to use for the user
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID in the table if the user is created successfully
 */
exports.create = function(email, password, name, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(SALT_ROUNDS, function(err, salt) {
            if(err){
                return reject(err);
            }
            bcrypt.hash(password, salt, function(err, hash) {
                if(err){
                    return reject(err);
                }
                connection.query('INSERT INTO `user` (email, password, name, uuid) VALUES (?, ?, ?, UUID_TO_BIN(UUID()))', [email, hash, name], function(err, result, fields) {
                    if(err) return reject(err);
                    resolve(result.insertId);
                });
            });
        });
    });
};

/**
 * Updates the email of a user with a given ID
 *
 * @param {Number} id The ID of the user being updated
 * @param {String} newEmail The new email to set for the user
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updateEmail = function(id, newEmail, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(salt)
        connection.query('UPDATE `user` SET `email` = ? WHERE `id` = ?', [newEmail, id], function(err, result, fields) {
            if(err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Updates the password of a user with a given ID
 *
 * @param {Number} id The ID of the user being updated
 * @param {String} newPassword The new password to set for the user
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updatePassword = function(id, newPassword, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(SALT_ROUNDS, function(err, salt) {
            if(err){
                return reject(err);
            }
            bcrypt.hash(newPassword, salt, function(err, hash) {
                if(err){
                    return reject(err);
                }
                connection.query('UPDATE `user` SET `password` = ? WHERE `id` = ?', [hash, id], function(err, result, fields) {
                    if(err) return reject(err);
                    resolve(id);
                });
            });
        });
    });
};

/**
 * Updates the name of a user with a given ID
 *
 * @param {Number} id The ID of the user being updated
 * @param {String} newName The new name to set for the user
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updateName = function(id, newName, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('UPDATE `user` SET `name` = ? WHERE `id` = ?', [newName, id], function(err, result, fields) {
            if(err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Compare a user's password with the password stored in the database
 *
 * @param id The ID of the user that's being compared
 * @param password The password that's being compared
 * @param connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to true if the password matches or false if it doesn't
 */
exports.comparePassword = function(id, password, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT `password` FROM `user` WHERE `id` = ?', [id], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('User not found'));
            const databasePassword = rows[0].password;
            bcrypt.compare(password, databasePassword, function(err, result){
                if(err) return reject(err);
                if(result) {
                    return resolve(true);
                }
                else{
                    return resolve(false);
                }
            })
        });
    });
};
