const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

/**
 * Get a coin by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the coin data if it's successful
 */
exports.getById = function (id, columns = ['id', 'name', 'symbol', 'uuid'], connection = mysql.pool) {
    // Replace plain uuid column name with BIN_TO_UUID mysql function to return the uuid string properly
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('coin')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Coin not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a coin by its UUID
 *
 * @param {String} uuid The UUID string to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the coin data if it's successful
 */
exports.getByUuid = function (uuid, columns = ['id', 'name', 'symbol', 'uuid'], connection = mysql.pool) {
    // Replace plain uuid column name with BIN_TO_UUID mysql function to return the uuid string properly
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('coin')
            .select(columns)
            .whereRaw('`uuid` = UUID_TO_BIN(?)', [uuid]);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Coin not found'));
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
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of coin data if it's successful
 */
exports.getListByName = function (name, previousId = 0, limit = 10, orderBy = 'name', order = 'desc', columns = ['id', 'name', 'symbol', 'uuid'], connection = mysql.pool) {
    // Replace plain uuid column name with BIN_TO_UUID mysql function to return the uuid string properly
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        let query = knex('coin')
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
 * Create a new coin with the given information
 *
 * @param {String} name The name to use for the coin
 * @param {String} symbol The symbol to use for the coin
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the coin is created successfully
 */
exports.create = function (name, symbol, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('coin')
            .insert({
                name: name,
                symbol: symbol,
                uuid: knex.raw('UUID_TO_BIN(UUID())')
            });
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

/**
 * Updates the name of a coin with a given ID
 *
 * @param {Number} id The ID of the coin being updated
 * @param {String} newName The new name to set for the coin
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the coin is updated successfully
 */
exports.updateName = function (id, newName, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('coin')
            .where('id', id)
            .update({name: newName});
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Updates the symbol of a coin with a given ID
 *
 * @param {Number} id The ID of the coin being updated
 * @param {String} newSymbol The new symbol to set for the coin
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the coin is updated successfully
 */
exports.updateSymbol = function (id, newSymbol, connection = mysql.pool) {
    const query = knex('coin')
        .where('id', id)
        .update({symbol: newSymbol});
    connection.query(query.toQuery(), function (err, result, fields) {
        if (err) return reject(err);
        resolve(id);
    });
};
