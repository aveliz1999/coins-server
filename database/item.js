const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

/**
 * Get an item by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the item data if it's successful
 */
exports.getById = function (id, columns = ['id', 'coin', 'name', 'cost', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('item')
            .select(columns)
            .where('id', id);
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Item not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get an item by its UUID
 *
 * @param {String} uuid The UUID string to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the item data if it's successful
 */
exports.getByUuid = function (uuid, columns = ['id', 'coin', 'name', 'cost', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(uuid) as `uuid`');
        }
        return column;
    });
    return new Promise(function (resolve, reject) {
        const query = knex('item')
            .select(columns)
            .whereRaw('`uuid` = UUID_TO_BIN(?)', [uuid])
        connection.query(query.toQuery(), [uuid], function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Item not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of items by their coin
 *
 * @param {Number} coinId The id of the coin to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "name"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of item data if it's successful
 */
exports.getListByCoin = function (coinId, previousId = 0, limit = 10, orderBy = 'name', order = 'desc', columns = ['id', 'coin', 'name', 'cost', 'uuid'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('item')
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
 * Create a new item with the given information
 *
 * @param {Number} coinId the id of the coin the item belongs to
 * @param {String} name The name to use for the item
 * @param {Number} cost The cost to use for the item
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the item is created successfully
 */
exports.create = function (coinId, name, cost, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('item')
            .insert({
                coin: coinId,
                name: name,
                cost: cost,
                uuid: knex.raw('UUID_TO_BIN(UUID())')
            });
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

/**
 * Updates the name of an item with a given ID
 *
 * @param {Number} id The ID of the item being updated
 * @param {String} newName The new name to set for the item
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the item is updated successfully
 */
exports.updateName = function (id, newName, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        connection.query('UPDATE `item` SET `name` = ? WHERE `id` = ?', [newName, id], function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};

/**
 * Updates the cost of an item with a given ID
 *
 * @param {Number} id The ID of the item being updated
 * @param {Number} newCost The new cost to set for the item
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the changed id if the item is updated successfully
 */
exports.updateCost = function (id, newCost, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('item')
            .where('id', id)
            .update({cost: newCost});
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(id);
        });
    });
};
