const mysql = require('./mysql');

/**
 * Get a transaction by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the transaction data if it's successful
 */
exports.getById = function (id, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        connection.query('SELECT * FROM `transaction` WHERE `id` = ?', [id], function (err, rows, fields) {
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
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListBySender = function (senderId, previousId = 0, limit = 10, orderBy = 'timestamp', connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query;
        let parameters;
        if (previousId === 0) {
            query = 'SELECT * FROM `transaction` WHERE `sender` = ? ORDER BY ? LIMIT ?';
            parameters = [senderId, orderBy, limit];
        } else {
            query = 'SELECT * FROM `transaction` WHERE `id` > ? AND `sender` = ? ORDER BY ? LIMIT ?';
            parameters = [previousId, senderId, orderBy, limit];
        }
        connection.query(query, parameters, function (err, rows, fields) {
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
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByReceiver = function (receiverId, previousId = 0, limit = 10, orderBy = 'timestamp', connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query;
        let parameters;
        if (previousId === 0) {
            query = 'SELECT * FROM `transaction` WHERE `receiver` = ? ORDER BY ? LIMIT ?';
            parameters = [receiverId, orderBy, limit];
        } else {
            query = 'SELECT * FROM `transaction` WHERE `id` > ? AND `receiver` = ? ORDER BY ? LIMIT ?';
            parameters = [previousId, receiverId, orderBy, limit];
        }
        connection.query(query, parameters, function (err, rows, fields) {
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
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByUsers = function (userId, previousId = 0, limit = 10, orderBy = 'timestamp', connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query;
        let parameters;
        if (previousId === 0) {
            query = 'SELECT * FROM `transaction` WHERE `receiver` = ? OR `sender` = ? ORDER BY ? LIMIT ?';
            parameters = [userId, userId, orderBy, limit];
        } else {
            query = 'SELECT * FROM `transaction` WHERE `id` > ? AND (`receiver` = ? OR `sender` = ?) ORDER BY ? LIMIT ?';
            parameters = [previousId, userId, userId, orderBy, limit];
        }
        connection.query(query, parameters, function (err, rows, fields) {
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
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByCoin = function (coinId, previousId = 0, limit = 10, orderBy = 'timestamp', connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query;
        let parameters;
        if (previousId === 0) {
            query = 'SELECT * FROM `transaction` WHERE `coin` = ? ORDER BY ? LIMIT ?';
            parameters = [coinId, orderBy, limit];
        } else {
            query = 'SELECT * FROM `transaction` WHERE `id` > ? AND `coin` = ? ORDER BY ? LIMIT ?';
            parameters = [previousId, coinId, orderBy, limit];
        }
        connection.query(query, parameters, function (err, rows, fields) {
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
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the transaction is created successfully
 */
exports.create = function (senderId, receiverId, coinId, amount, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        connection.query('INSERT INTO `transaction` (sender, receiver, coin, amount, timestamp) VALUES (?, ?, ?, ?, NOW(3))', [senderId, receiverId, coinId, amount], function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};
