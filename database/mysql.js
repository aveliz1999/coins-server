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
    '  CONSTRAINT `entry_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`),\n' +
    '  CONSTRAINT `entry_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`)\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
const createTransactionTableQuery = 'CREATE TABLE IF NOT EXISTS `transaction` (\n' +
    '  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,\n' +
    '  `sender` int(10) unsigned NOT NULL,\n' +
    '  `receiver` int(10) unsigned NOT NULL,\n' +
    '  `coin` int(10) unsigned NOT NULL,\n' +
    '  `amount` int(10) unsigned NOT NULL,\n' +
    '  `timestamp` datetime(3) NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `sender_idx` (`sender`),\n' +
    '  KEY `receiver_idx` (`receiver`),\n' +
    '  KEY `coin_idx` (`coin`),\n' +
    '  CONSTRAINT `transaction_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`),\n' +
    '  CONSTRAINT `transaction_receiver` FOREIGN KEY (`receiver`) REFERENCES `user` (`id`),\n' +
    '  CONSTRAINT `transaction_sender` FOREIGN KEY (`sender`) REFERENCES `user` (`id`)\n' +
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
    '  CONSTRAINT `item_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`)\n' +
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
    '  `role_code` int(10) unsigned NOT NULL,\n' +
    '  PRIMARY KEY (`id`),\n' +
    '  UNIQUE KEY `id_UNIQUE` (`id`),\n' +
    '  KEY `role_coin_idx` (`coin`),\n' +
    '  KEY `role_user_idx` (`user`),\n' +
    '  KEY `role_code_idx` (`role_code`),\n' +
    '  CONSTRAINT `role_code` FOREIGN KEY (`role_code`) REFERENCES `role_code` (`id`),\n' +
    '  CONSTRAINT `role_coin` FOREIGN KEY (`coin`) REFERENCES `coin` (`id`),\n' +
    '  CONSTRAINT `role_user` FOREIGN KEY (`user`) REFERENCES `user` (`id`)\n' +
    ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

const connection = mysql.createConnection({connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: process.env.DATABASE_PASSWORD,
    database: 'coins_test',
    multipleStatements: true});
connection.query(`${createUserTableQuery};
    ${createCoinTableQuery};
    ${createEntryTableQuery};
    ${createTransactionTableQuery};
    ${createItemTableQuery};
    ${createRoleCodeTableQuery};
    ${createRoleTableQuery}`, function(err) {
    if(err){
        console.error(err);
        process.exit(-1);
    }
});

exports.pool = pool;
exports.getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
};
