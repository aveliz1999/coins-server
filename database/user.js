const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});
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
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the user data if it's successful
 */
exports.getById = function (id, columns = ['id', 'email', 'password', 'name', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('User not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a user by their UUID
 *
 * @param {String} uuid The UUID string to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the user data if it's successful
 */
exports.getByUuid = function (uuid, columns = ['id', 'email', 'password', 'name', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .select(columns)
            .whereRaw('`uuid` = UUID_TO_BIN(?)', [uuid]);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('User not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a user by their email
 *
 * @param {String} email The email string to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of user data if it's successful
 */
exports.getByEmail = function (email, columns = ['id', 'email', 'password', 'name', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .select(columns)
            .where('email', email);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('User not found'));
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
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of user data if it's successful
 */
exports.getListByName = function (name, previousId = 0, limit = 10, orderBy = 'name', order='desc', columns = ['id', 'email', 'password', 'name', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        let query = knex('user')
            .select(columns)
            .where('name', name)
            .orderBy(orderBy, order)
            .limit(limit);
        if(previousId > 0){
            query = query.where('id', '>', previousId)
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Get a list of users by searching their names
 *
 * @param {String} name The name string to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "name"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of user data if it's successful
 */
exports.searchByName = function (name, previousId = 0, limit = 10, orderBy = 'name', order='desc', columns = ['id', 'email', 'password', 'name', 'uuid'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('user')
            .select(columns)
            .where('name', 'like', name + '%')
            .orderBy(orderBy, order)
            .limit(limit);
        if(previousId > 0){
            query = query.where('id', '>', previousId)
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            resolve(rows);
        });
    })
};

/**
 * Create a new user with the given information
 *
 * @param {String} email The email to use for the user. Must be unique or it returns an error
 * @param {String} password The password to use for the user
 * @param {String} name The name to use for the user
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID in the table if the user is created successfully
 */
exports.create = function (email, password, name, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        bcrypt.genSalt(SALT_ROUNDS, function (err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) {
                    return reject(err);
                }
                const query = knex('user')
                    .insert({
                        email: email,
                        password: hash,
                        name: name,
                        uuid: knex.raw('UUID_TO_BIN(UUID())')
                    });
                connection.query(query.toQuery(), function (err, result, fields) {
                    if (err) return reject(err);
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
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updateEmail = function (id, newEmail, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .where('id', id)
            .update({email: newEmail});
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Updates the password of a user with a given ID
 *
 * @param {Number} id The ID of the user being updated
 * @param {String} newPassword The new password to set for the user
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updatePassword = function (id, newPassword, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        bcrypt.genSalt(SALT_ROUNDS, function (err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(newPassword, salt, function (err, hash) {
                if (err) {
                    return reject(err);
                }
                const query = knex('user')
                    .where('id', id)
                    .update({password: hash});
                connection.query(query.toQuery(), function (err, result, fields) {
                    if (err) return reject(err);
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
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the user is updated successfully
 */
exports.updateName = function (id, newName, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .where('id', id)
            .update({name: newName});
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Compare a user's password with the password stored in the database
 *
 * @param {String} email The ID of the user that's being compared
 * @param {String} password The password that's being compared
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the id and uuid of the user if the password matches or false if it doesn't
 */
exports.comparePassword = function (email, password, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('user')
            .select('id', 'password', knex.raw('BIN_TO_UUID(uuid) as `uuid`'))
            .where('email', email);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('User not found'));
            const databasePassword = rows[0].password;
            bcrypt.compare(password, databasePassword, function (err, result) {
                if (err) return reject(err);
                if (result) {
                    return resolve({id: rows[0].id, uuid: rows[0].uuid});
                } else {
                    return resolve(false);
                }
            })
        });
    });
};
