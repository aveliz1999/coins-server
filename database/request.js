const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

/**
 * Get a request by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the transaction data if it's successful
 */
exports.getById = function (id, columns = ['id', 'requester', 'sender', 'coin', 'amount', 'uuid'], connection = mysql.pool) {
    // Replace plain uuid column name with BIN_TO_UUID mysql function to return the uuid string properly
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('request')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Request not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a request by its UUID
 *
 * @param {String} uuid The UUID string to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the request data if it's successful
 */
exports.getByUuid = function (uuid, columns = ['id', 'requester', 'sender', 'coin', 'amount', 'message', 'uuid'], connection = mysql.pool) {
    // Replace plain uuid column name with BIN_TO_UUID mysql function to return the uuid string properly
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('request')
            .select(columns)
            .whereRaw('`uuid` = UUID_TO_BIN(?)', [uuid]);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Request not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Create a new request with the given information
 *
 * @param {Number} requester The ID of the user that is sending the request
 * @param {Number} sender The ID of the user receiving the request, who would send an amount of coins back
 * @param {Number} coin The coin type being requested
 * @param {Number} amount The amount of coin being requested
 * @param {String} message The message to pass along with the request and transaction
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID in the table if the request is created successfully
 */
exports.create = function(requester, sender, coin, amount, message, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('request')
            .insert({
                requester: requester,
                sender: sender,
                coin: coin,
                amount: amount,
                message: message,
                uuid: knex.raw('UUID_TO_BIN(UUID())')
            });
        connection.query(query.toQuery(), [requester, sender, coin, amount], function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

/**
 * Delete a request entry with a given ID.
 *
 * @param {Number} id The ID of the request to delete.
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves with no value when the request is deleted or rejects with an error
 */
exports.delete = function(id, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        const query = knex('request')
            .where('id', id)
            .del();
        connection.query(query.toQuery(), function(err, result, fields) {
            if(err) {
                return reject(err);
            }
            resolve();
        })
    });
};
