const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: process.env.DATABASE_POOL_LIMIT | 10,
    host: process.env.DATABASE_HOST | 'localhost',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

const createUserTableQuery = 'CREATE TABLE IF NOT EXISTS `user` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `email` varchar(50) NOT NULL,\n' +
    '  `password` char(60) NOT NULL,\n' +
    '  `uuid` binary(16) NOT NULL,\n' +
    '  `name` varchar(45) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  UNIQUE KEY `email_UNIQUE` (`email`),\n' +
    '  UNIQUE KEY `uuid_UNIQUE` (`uuid`)\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createCoinTableQuery = 'CREATE TABLE IF NOT EXISTS `coin` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `name` varchar(45) NOT NULL,\n' +
    '  `symbol` varchar(3) NOT NULL,\n' +
    '  `uuid` binary(16) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  UNIQUE KEY `uuid_UNIQUE` (`uuid`)\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createEntryTableQuery = 'CREATE TABLE IF NOT EXISTS `entry` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `user` int(10) unsigned NOT NULL,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `amount` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `coin_idx` (`coin`),\n' +
    '  KEY `entry_user` (`user`),\n' +
    '  CONSTRAINT `entry_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `entry_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createTransactionTableQuery = 'CREATE TABLE IF NOT EXISTS `transaction` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `sender` int(10) unsigned,\n' +
    '  `receiver` int(10) unsigned,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `amount` int(10) unsigned NOT NULL,\n' +
    '  `timestamp` datetime(3) NOT NULL,\n' +
    '  `message` char(64) NOT NULL,\n ' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `sender_idx` (`sender`),\n' +
    '  KEY `receiver_idx` (`receiver`),\n' +
    '  KEY `coin_idx` (`coin`),\n' +
    '  CONSTRAINT `transaction_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `transaction_receiver` FOREIGN KEY (`receiver`) REFERENCES `user` (`id`) ON DELETE SET NULL,\n' +
    '  CONSTRAINT `transaction_sender` FOREIGN KEY (`sender`) REFERENCES `user` (`id`) ON DELETE SET NULL\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createItemTableQuery = 'CREATE TABLE IF NOT EXISTS `item` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `name` varchar(25) NOT NULL,\n' +
    '  `cost` int(10) unsigned NOT NULL,\n' +
    '  `uuid` binary(16) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  UNIQUE KEY `uuid_UNIQUE` (`uuid`),\n' +
    '  KEY `item_coin_idx` (`coin`),\n' +
    '  CONSTRAINT `item_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createUserItemTableQuery = 'CREATE TABLE IF NOT EXISTS `user_item` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `item` int(10) unsigned NOT NULL,\n' +
    '  `user` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `user_item_item_idx` (`item`),\n' +
    '  KEY `user_item_user_idx` (`user`),\n' +
    '  CONSTRAINT `user_item_item` FOREIGN KEY (`item`) REFERENCES `item` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `user_item_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createRoleCodeTableQuery = 'CREATE TABLE IF NOT EXISTS `role_code` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `type` varchar(45) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  UNIQUE KEY `type_UNIQUE` (`type`)\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createRoleTableQuery = 'CREATE TABLE IF NOT EXISTS `role` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `user` int(10) unsigned NOT NULL,\n' +
    '  `role_code` int(10) unsigned,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `role_coin_idx` (`coin`),\n' +
    '  KEY `role_user_idx` (`user`),\n' +
    '  KEY `role_code_idx` (`role_code`),\n' +
    '  CONSTRAINT `role_code` FOREIGN KEY (`role_code`) REFERENCES `role_code` (`id`) ON DELETE SET NULL,\n' +
    '  CONSTRAINT `role_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `role_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createRequestTableQuery = 'CREATE TABLE IF NOT EXISTS `request` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `requester` int(10) unsigned NOT NULL,\n' +
    '  `sender` int(10) unsigned NOT NULL,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `amount` int(10) unsigned NOT NULL,\n' +
    '  `message` char(64) NOT NULL,\n' +
    '  `uuid` binary(16) NOT NULL,\n' +
    '  `timestamp` datetime(3) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  UNIQUE KEY `uuid_UNIQUE` (`uuid`),\n' +
    '  KEY `request_requester_idx` (`requester`),\n' +
    '  KEY `requester_sender_idx` (`sender`),\n' +
    '  KEY `request_coin_idx` (`coin`),\n' +
    '  CONSTRAINT `request_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `request_requester` FOREIGN KEY (`requester`) REFERENCES `user` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `request_sender` FOREIGN KEY (`sender`) REFERENCES `user` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

const defaultCurrencyCreateQuery = 'INSERT INTO `coin` (id, name, symbol, uuid) VALUES (1, ?, ?, UUID_TO_BIN(UUID())) ON DUPLICATE KEY UPDATE id=1, name=?, symbol=?';

/**
 * The connection pool used for queries
 * @type {Pool}
 */
exports.pool = pool;

/**
 * Sort types for the database.
 * Ascending or Descending.
 *
 * @type {{ASCENDING: string, DESCENDING: string}}
 */
const SortType = {
    ASCENDING: 'ASC',
    DESCENDING: 'DESC'
};
exports.SortType = SortType;

/**
 * Get a connection from the pool as a promise
 *
 * @returns {Promise<Connection>} The promise that resolves to a connection or rejects with an error
 */
exports.getConnection = function() {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if(err) {
                return reject(err);
            }
            resolve(connection);
        });
    });

};

/**
 * Begin a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection to begin a transaction in
 * @returns {Promise} A promise that resolves with no value once the transaction has begun or rejects with an error
 */
exports.beginTransaction = function(connection) {
    return new Promise(function(resolve, reject) {
        connection.beginTransaction(function(err) {
           if(err){
               return reject(err);
           }
           return resolve();
        });
    });
};

/**
 * Commit a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection with a pending transaction.
 * @returns {Promise} A promise that resolves with no value once the transaction has committed or rejects it with an error
 */
exports.commitTransaction = function (connection) {
    return new Promise(function (resolve, reject) {
        connection.commit(function (err) {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
};

/**
 * Roll back a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection with the transaction to roll back
 * @returns {Promise} A promise that resolves once the transaction is rolled back
 */
exports.rollbackTransaction = function(connection) {
    return new Promise(function(resolve, reject) {
        connection.rollback(function() {
            resolve();
        });
    });
};

/**
 * Set up the tables required for the project to work as well as a default coin to use for all users.
 * Exit the process if an error occurs. Due to this function being executed only by the master process, that should
 * stop the entire program if it happens.
 */
exports.setup = function () {
    const connection = mysql.createConnection({
        connectionLimit: 10,
        host: 'localhost',
        user: 'root',
        password: process.env.DATABASE_PASSWORD,
        database: 'coins_test',
        multipleStatements: true
    });
    const queries = [
        {query: createUserTableQuery, message: 'Creating user table...'},
        {query: createCoinTableQuery, message: 'Creating coin table...'},
        {query: createEntryTableQuery, message: 'Creating entry table...'},
        {query: createTransactionTableQuery, message: 'Creating entry table...'},
        {query: createItemTableQuery, message: 'Creating item table...'},
        {query: createUserItemTableQuery, message: 'Creating user item table...'},
        {query: createRoleCodeTableQuery, message: 'Creating role code table...'},
        {query: createRoleTableQuery, message: 'Creating role table...'},
        {query: createRequestTableQuery, message: 'Creating request table...'}
    ];
    const promises = queries.map(function (query) {
        return new Promise(function (resolve, reject) {
            console.log(query.message);
            connection.query(query.query, [], function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        })
    });
    Promise.all(promises)
        .then(function() {
            console.log('Finished creating tables.');
            console.log('Creating default coin');
            connection.query(defaultCurrencyCreateQuery, [process.env.DEFAULT_COIN_NAME || 'Universal Coin',
                process.env.DEFAULT_COIN_SYMBOL || 'μ',
                process.env.DEFAULT_COIN_NAME || 'Universal Coin',
                process.env.DEFAULT_COIN_SYMBOL || 'μ'], function (err) {
                if (err) {
                    return Promise.reject(err);
                }
                console.log('Finished setting up database');
                connection.destroy();
            });
        })
        .catch(function(err) {
            console.error(err);
            process.exit(-1);
        });
};
