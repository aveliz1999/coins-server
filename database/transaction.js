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
 * @param {String} idOperator The operator (<, >, =) to use in the where for the previous id
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "timestamp"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {boolean} join Whether to retrieve the sender, receiver, and coin information as a JOIN in the query
 * @param {String[]} joinUserFields The fields to select from the joined sender and receiver
 * @param {String[]} joinCoinFields The fields to select from the joined coin
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of transaction data if it's successful
 */
exports.getListByUsers = function (userId, previousId = 0, idOperator = '<', limit = 10, orderBy = 'id', order = 'desc', columns = ['id', 'sender', 'receiver', 'coin', 'amount', 'timestamp', 'message'], join = true, joinUserFields = ['id', 'email', 'password', 'name', 'uuid'], joinCoinFields = ['id', 'name', 'symbol', 'uuid'], connection = mysql.pool) {
    columns = columns.map(function(column) {
        return 'transaction.' + column;
    });

    // If join flag is on (query will JOIN the sender, requester, and sender), add the appropriate fields to the columns
    if(join) {
        for(let field of joinUserFields) {
            if(field !== 'uuid') {
                columns.push(knex.raw('`sender`.`' + field + '` as `sender_' + field + '`', []));
                columns.push(knex.raw('`receiver`.`' + field + '` as `receiver_' + field + '`', []));
            }
            else{
                columns.push(knex.raw('BIN_TO_UUID(`sender`.`uuid`)' + ' as `sender_uuid`', []));
                columns.push(knex.raw('BIN_TO_UUID(`receiver`.`uuid`)' + ' as `receiver_uuid`', []));
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
        delete columns.receiver;
        delete columns.coin;
    }

    return new Promise(function (resolve, reject) {
        let query = knex('transaction')
            .select(columns)
            .where('transaction.id', idOperator, previousId)
            .andWhereRaw('(receiver = ? OR sender = ?)', [userId, userId])
            .orderBy(orderBy, order)
            .limit(limit);
        if(join) {
            query = query.innerJoin(knex.raw('user as sender', []), 'sender.id', 'sender')
                .innerJoin(knex.raw('user as receiver', []), 'receiver.id', 'receiver')
                .innerJoin(knex.raw('coin', []), 'coin.id', 'coin');
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            return resolve(rows);
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
