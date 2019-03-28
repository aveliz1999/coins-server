const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

/**
 * Get an entry by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the entry data if it's successful
 */
exports.getById = function (id, columns = ['id', 'user', 'coin', 'amount'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('entry')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Entry not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get an entry that belongs to a specific coin and user
 *
 * @param {Number} coinId The coin it belongs to
 * @param {Number} userId The user it belongs to
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the entry data if it's successful
 */
exports.getByCoinAndUser = function(coinId, userId, columns = ['id', 'user', 'coin', 'amount'], connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        const query = knex('entry')
            .select(columns)
            .where('coin', coinId)
            .where('user', userId);
        connection.query(query.toQuery(), [coinId, userId], function(err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Entry not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of entries by their user
 *
 * @param {Number} userId The integer user ID to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "amount"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of entry data if it's successful
 */
exports.getListByUser = function (userId, previousId = 0, limit = 10, orderBy = 'amount', order = 'desc', columns = ['id', 'user', 'coin', 'amount'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('entry')
            .select(columns)
            .where('user', userId)
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
 * Get a list of entries by their coin
 *
 * @param {Number} coinId The integer coin ID to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "amount"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of entry data if it's successful
 */
exports.getListByCoin = function (coinId, previousId = 0, limit = 10, orderBy = 'amount', order = 'desc', columns = ['id', 'user', 'coin', 'amount'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('entry')
            .select(columns)
            .where('coin', coinId)
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
 * Create a new entry with the given information
 *
 * @param {Number} userId The id of the user the entry belongs to
 * @param {Number} coinId The id of the coin the entry uses
 * @param {Number} amount The amount in the entry. Defaults to 0
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the entry is created successfully
 */
exports.create = function (userId, coinId, amount = 0, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('entry')
            .insert({
                user: userId,
                coin: coinId,
                amount: amount
            });
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

/**
 * Updates the amount of an entry with a given ID
 *
 * @param {Number} id The ID of the entry being updated
 * @param {String} newAmount The new amount to set for the entry
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the entry is updated successfully
 */
exports.updateAmount = function (id, newAmount, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('entry')
            .where('id', id)
            .update({amount: newAmount});
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};
