const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

/**
 * Get a transaction by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the transaction data if it's successful
 */
exports.getById = function (id, columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('transaction')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Transaction not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of transactions by their sender
 *
 * @param {Number} senderId The id of the sender to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListBySender = function (senderId, previousId = 0, limit = 10, orderBy = 'timestamp', order = 'desc', columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('transaction')
            .select(columns)
            .where('sender', senderId)
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
 * Get a list of transactions by their receiver
 *
 * @param {Number} receiverId The id of the receiver to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByReceiver = function (receiverId, previousId = 0, limit = 10, orderBy = 'timestamp', order = 'desc', columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('transaction')
            .select(columns)
            .where('receiver', receiverId)
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
 * Get a list of transactions by either sender or receiver
 *
 * @param {Number} userId The id of the sender/receiver to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByUsers = function (userId, previousId = 0, limit = 10, orderBy = 'timestamp', order = 'desc', columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('transaction')
            .select(columns)
            .where('receiver', userId)
            .orWhere('sender', userId)
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
 * Get a list of transactions by their coin
 *
 * @param {Number} coinId The id of the coin to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByCoin = function (coinId, previousId = 0, limit = 10, orderBy = 'timestamp', order = 'desc', columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('transaction')
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
 * Create a new transaction with the given information
 *
 * @param {Number} senderId the id of the transaction sender
 * @param {Number} receiverId the id of the transaction receiver
 * @param {Number} coinId The id of the coin the transaction uses
 * @param {Number} amount The amount transferred in the transaction
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the transaction is created successfully
 */
exports.create = function (senderId, receiverId, coinId, amount, message, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('transaction')
            .insert({
                sender: senderId,
                receiver: receiverId,
                coin: coinId,
                amount: amount,
                message: message,
                timestamp: knex.raw('NOW(3)')
            });
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};
