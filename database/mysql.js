const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: process.env.DATABASE_POOL_LIMIT | 10,
    host: process.env.DATABASE_HOST | 'localhost',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

exports.pool = pool;
exports.getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
};
