const mysql = require('./mysql');
const knex = require('knex')({client: 'mysql'});

exports.roleCodes = {
    1: 'OWNER'
};

/**
 * Get a coin by its ID
 *
 * @param {Number} id The integer ID to look for
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the coin data if it's successful
 */
exports.getById = function (id, columns = ['role.id', 'coin', 'user', 'role_code.type'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('role')
            .select(columns)
            .where('id', id)
            .join('role_code', 'role.role_code', 'role_code.id');
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Role not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Get a list of roles by their coin
 *
 * @param {String} coin The coin id to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {String} operator Operator to use when comparing records to the previous last ID retrieved. Defaults to ">"
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "role.id"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of role data if it's successful
 */
exports.getListByCoin = function (coin, previousId = 0, operator = '>', limit = 10, orderBy = 'role.id', order = 'desc', columns = ['role.id', 'coin', 'user', 'role_code.type'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('role')
            .select(columns)
            .where('coin', coin)
            .orderBy(orderBy, order)
            .join('role_code', 'role.role_code', 'role_code.id')
            .limit(limit);
        if(previousId > 0){
            query = query.where('id', operator, previousId)
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Get a list of roles by their user
 *
 * @param {String} user The user id to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {String} operator Operator to use when comparing records to the previous last ID retrieved. Defaults to ">"
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "role.id"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of role data if it's successful
 */
exports.getListByUser = function (user, previousId = 0, operator = '>', limit = 10, orderBy = 'role.id', order = 'desc', columns = ['role.id', 'coin', 'user', 'role_code.type'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('role')
            .select(columns)
            .where('user', user)
            .orderBy(orderBy, order)
            .join('role_code', 'role.role_code', 'role_code.id')
            .limit(limit);
        if(previousId > 0){
            query = query.where('id', operator, previousId)
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Get a role by its user and coin
 *
 * @param {String} coin The coin id to look for
 * @param {String} user The user id to look for
 * @param {Number} previousId The row id to start looking. Used for pagination, and defaults to 0
 * @param {String} operator Operator to use when comparing records to the previous last ID retrieved. Defaults to ">"
 * @param {Number} limit The amount of rows to retrieve. Defaults to 10
 * @param {String} orderBy How to order the returned rows. Defaults to "role.id"
 * @param {String} order The way to order the returned rows. Defaults to "desc", or descending
 * @param {String[]} columns The columns to retrieve from the database
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to a list of role data if it's successful
 */
exports.getByCoinAndUser = function (coin, user, previousId = 0, operator = '>', limit = 10, orderBy = 'role.id', order = 'desc', columns = ['role.id', 'coin', 'user', 'role_code.type'], connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        let query = knex('role')
            .select(columns)
            .where('coin', coin)
            .where('user', user)
            .orderBy(orderBy, order)
            .join('role_code', 'role.role_code', 'role_code.id')
            .limit(limit);
        if(previousId > 0){
            query = query.where('id', operator, previousId)
        }
        connection.query(query.toQuery(), function (err, rows, fields) {
            if (err) return reject(err);
            if (rows[0] === undefined) return reject(new Error('Role not found'));
            resolve(rows[0]);
        });
    });
};

/**
 * Create a new role with the given information
 *
 * @param {Number} coin The id of the coin
 * @param {Number} user The id of the user
 * @param {Number} roleCode The id of the role code
 * @param {Connection|Pool} connection The connection to use for the query. By default retrieves a new one from the connection pool
 * @returns {Promise} A promise that resolves to the inserted ID if the coin is created successfully
 */
exports.create = function (coin, user, roleCode, connection = mysql.pool) {
    return new Promise(function (resolve, reject) {
        const query = knex('role')
            .insert({
                coin: coin,
                user: user,
                role_code: roleCode
            });
        connection.query(query.toQuery(), function (err, result, fields) {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};
