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
exports.getById = function (id, columns = ['id', 'requester', 'sender', 'coin', 'amount', 'message', 'uuid', 'timestamp'], connection = mysql.pool) {
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
exports.getByUuid = function (uuid, columns = ['id', 'requester', 'sender', 'coin', 'amount', 'message', 'uuid', 'timestamp'], connection = mysql.pool) {
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
 * Get a list of requests by their sender
 *
 * @param {Number} senderId The id of the sender to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {String} idOperator The operator (<, >, =) to use in the where for the previous id
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {Object[]} columns The columns to retrieve from the database
 * @param {boolean} join Whether to retrieve the requester, sender, and coin information as a JOIN in the query
 * @param {String[]} joinUserFields The fields to select from the joined requester and sender
 * @param {String[]} joinCoinFields The fields to select from the joined coin
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListBySender = function (senderId, previousId = 0, idOperator = '<', limit = 10, orderBy = 'id', order = 'desc', columns = ['id', 'requester', 'sender', 'coin', 'amount', 'message', 'uuid', 'timestamp'], join = true, joinUserFields = ['id', 'email', 'password', 'name', 'uuid'], joinCoinFields = ['id', 'name', 'symbol', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        if(column === 'uuid'){
            return knex.raw('BIN_TO_UUID(`request`.`uuid`) as `uuid`');
        }
        return 'request.' + column;
    });

    // If join flag is on (query will JOIN the sender, requester, and sender), add the appropriate fields to the columns
    if(join) {
        for(let field of joinUserFields) {
            if(field !== 'uuid') {
                columns.push(knex.raw('`sender`.`' + field + '` as `sender_' + field + '`', []));
                columns.push(knex.raw('`requester`.`' + field + '` as `requester_' + field + '`', []));
            }
            else{
                columns.push(knex.raw('BIN_TO_UUID(`sender`.`uuid`)' + ' as `sender_uuid`', []));
                columns.push(knex.raw('BIN_TO_UUID(`requester`.`uuid`)' + ' as `requester_uuid`', []));
            }
        }
        for(let field of joinCoinFields) {
            if(field !== 'uuid'){
                columns.push(knex.raw('`coin`.`' + field + '` as `coin_' + field + '`', []));
            }
            else{
                columns.push(knex.raw('BIN_TO_UUID(`coin`.`uuid`) as `coin_uuid`'));
            }

        }
        // If join is on, sender, requester, and coin will be an object with the values returned by the join rather than the foreign IDs
        delete columns.sender;
        delete columns.requester;
        delete columns.coin;
    }

    return new Promise(function (resolve, reject) {
        let query = knex('request')
            .select(columns)
            .where('sender', senderId)
            .where('request.id', idOperator, previousId)
            .orderBy(orderBy, order)
            .limit(limit);
        if(join) {
            query = query.innerJoin(knex.raw('user as sender', []), 'sender.id', 'sender')
                .innerJoin(knex.raw('user as requester', []), 'requester.id', 'requester')
                .innerJoin(knex.raw('coin', []), 'coin.id', 'coin');
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            return resolve(rows);
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
                uuid: knex.raw('UUID_TO_BIN(UUID())'),
                timestamp: knex.raw('NOW(3)')
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
