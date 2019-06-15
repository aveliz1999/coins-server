const mysql = require('mysql');
const config = require('../config/' + process.env.NODE_ENV + '.json');
const promisify = require('util').promisify;

const pool = mysql.createPool({
    connectionLimit: config.databaseInformation.connectionLimit,
    host: config.databaseInformation.host,
    user: config.databaseInformation.username,
    password: config.databaseInformation.password,
    database: config.databaseInformation.name
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
    '  `uuid` binary(16) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `uuid_UNIQUE` (`uuid`),\n' +
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
const createRoleTableQuery = 'CREATE TABLE IF NOT EXISTS `role` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `name` varchar(32) NOT NULL,\n' +
    '  `level` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `role_coin_idx` (`coin`),\n' +
    '  KEY `role_level_idx` (`level`),\n' +
    '  KEY `role_coin_level` (`coin`, `level`),\n' +
    '  CONSTRAINT `role_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`) ON DELETE CASCADE\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createPermissionsTableQuery = 'CREATE TABLE IF NOT EXISTS `permission` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `permission` ENUM("DELETE_COIN","EDIT_COIN_INFO","EDIT_COIN_ROLES","EDIT_COIN_PERMISSIONS","ADDD_USER_ROLE","ADD_ITEM","DELETE_ITEM","EDIT_ITEM") NOT NULL,\n' +
    '  `level` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `permission_coin_idx` (`coin`),\n' +
    '  KEY `permission_level_idx` (`level`),\n' +
    '  CONSTRAINT `permission_role` FOREIGN KEY (`coin`, `level`) REFERENCES `role` (`coin`, `level`) ON DELETE CASCADE' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createUserRoleTableQuery = 'CREATE TABLE IF NOT EXISTS `user_role` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `user` int(10) unsigned NOT NULL,\n' +
    '  `role` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY user_role_user_idx (`user`),\n' +
    '  KEY user_role_role_idx (`role`),\n' +
    '  CONSTRAINT `user_role_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`) ON DELETE CASCADE,\n' +
    '  CONSTRAINT `user_role_role` FOREIGN KEY (`role`) REFERENCES `role` (`id`) ON DELETE CASCADE' +
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

const defaultCurrencyCreateQuery = 'INSERT INTO `coin` (id, name, symbol, uuid) VALUES (1, ?, ?, UUID_TO_BIN(UUID())) ON DUPLICATE KEY UPDATE name=?, symbol=?';
const createDefaultCoinOwnerRoleQuery = 'INSERT IGNORE INTO `role` (id, coin, name, level) VALUES (1, 1, "Owner", 1)';

/**
 * The connection pool used for queries
 * @type {Pool}
 */
exports.pool = pool;

/**
 * Get a connection from the pool as a promise
 *
 * @returns {Promise<Connection>} The promise that resolves to a connection or rejects with an error
 */
exports.getConnection = promisify(pool.getConnection.bind(pool));

/**
 * Begin a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection to begin a transaction in
 * @returns {Promise} A promise that resolves with no value once the transaction has begun or rejects with an error
 */
exports.beginTransaction = function(connection) {
    return promisify(connection.beginTransaction.bind(connection))();
};

/**
 * Commit a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection with a pending transaction.
 * @returns {Promise} A promise that resolves with no value once the transaction has committed or rejects it with an error
 */
exports.commitTransaction = function (connection) {
    return promisify(connection.commit.bind(connection))();
};

/**
 * Roll back a transaction in a connection as a promise
 *
 * @param {Connection} connection The connection with the transaction to roll back
 * @returns {Promise} A promise that resolves once the transaction is rolled back
 */
exports.rollbackTransaction = function(connection) {
    return promisify(connection.rollback.bind(connection))();
};

/**
 * Set up the tables required for the project to work as well as a default coin to use for all users.
 * Exit the process if an error occurs. Due to this function being executed only by the master process, that should
 * stop the entire program if it happens.
 */
exports.setup = async function () {
    const connection = mysql.createConnection({
        host: config.databaseInformation.host,
        user: config.databaseInformation.username,
        password: config.databaseInformation.password,
        database: config.databaseInformation.name,
        multipleStatements: true
    });

    // Queries that create the tables
    const tableQueries = [
        createUserTableQuery,
        createCoinTableQuery,
        createEntryTableQuery,
        createTransactionTableQuery,
        createItemTableQuery,
        createUserItemTableQuery,
        createRoleTableQuery,
        createPermissionsTableQuery,
        createUserRoleTableQuery,
        createRequestTableQuery
    ];
    // Queries that insert default entries into the tables
    const defaultQueries = [
        promisify(connection.query.bind(connection))(defaultCurrencyCreateQuery, [
            config.defaultCoin.name,
            config.defaultCoin.symbol,
            config.defaultCoin.name,
            config.defaultCoin.symbol
        ]),
        promisify(connection.query.bind(connection))(createDefaultCoinOwnerRoleQuery)
    ];

    try{
        const tablePromises = tableQueries.map(function (query) {
            return promisify(connection.query.bind(connection))(query);
        });

        await Promise.all(tablePromises);
        await Promise.all(defaultQueries);
        connection.destroy()
    }
    catch(err) {
        console.error(err);
        process.exit(-1);
    }

};
