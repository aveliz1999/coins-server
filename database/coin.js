const mysql = require('./mysql');

/**
 * Get a coin by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the coin data if it's successful
 */
exports.getById = function(id, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT id, name, symbol, BIN_TO_UUID(uuid) AS uuid FROM `coin` WHERE `id` = ?', [id], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('Coin not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a coin by its ID
 *
 * @param {String} uuid The UUID string to look for
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the coin data if it's successful
 */
exports.getByUuid = function(uuid, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('SELECT id, name, symbol, BIN_TO_UUID(uuid) AS uuid FROM `coin` WHERE `uuid` = UUID_TO_BIN(?)', [uuid], function(err, rows, fields) {
            if(err) return reject(err);
            if(rows[0] === undefined) return reject(new Error('Coin not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of coins by their name
 *
 * @param {String} name The name string to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "name"
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of coin data if it's successful
 */
exports.getListByName = function(name, previousId = 0, limit = 10, orderBy = 'name', connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        let query;
        let parameters;
        if(previousId === 0){
            query = 'SELECT id, name, symbol, BIN_TO_UUID(uuid) AS uuid FROM `coin` WHERE `name` = ? ORDER BY ? LIMIT ?';
            parameters = [name, orderBy, limit];
        }
        else{
            query = 'SELECT id, name, symbol, BIN_TO_UUID(uuid) AS uuid FROM `coin` WHERE `id` > ? AND `name` = ? ORDER BY ? LIMIT ?';
            parameters = [previousId, name, orderBy, limit];
        }
        connection.query(query, parameters, function(err, rows, fields) {
            if(err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Create a new coin with the given information
 *
 * @param {String} name The name to use for the coin
 * @param {String} symbol The symbol to use for the coin
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the coin is created successfully
 */
exports.create = function(name, symbol, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('INSERT INTO `coin` (name, symbol, uuid) VALUES (?, ?, UUID_TO_BIN(UUID()))', [name, symbol], function(err, result, fields) {
            if(err) return reject(err);
            resolve(result.insertId);
        });
    });
};

/**
 * Updates the name of a coin with a given ID
 *
 * @param {Number} id The ID of the coin being updated
 * @param {String} newName The new name to set for the coin
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the coin is updated successfully
 */
exports.updateName = function(id, newName, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('UPDATE `coin` SET `name` = ? WHERE `id` = ?', [newName, id], function(err, result, fields) {
            if(err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Updates the symbol of a coin with a given ID
 *
 * @param {Number} id The ID of the coin being updated
 * @param {String} newSymbol The new symbol to set for the coin
 * @param {Connection} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the coin is updated successfully
 */
exports.updateSymbol = function(id, newSymbol, connection = mysql.pool) {
    return new Promise(function(resolve, reject) {
        connection.query('UPDATE `coin` SET `symbol` = ? WHERE `id` = ?', [newSymbol, id], function(err, result, fields) {
            if(err) return reject(err);
            resolve(id);
        });
    });
};
