const express = require('express');
const router = express.Router();
const authenticatedMiddleware = require('../middleware/authenticated');
const mysql = require('../database/mysql');
const knex = require('knex')({client: 'mysql'});

router.use(authenticatedMiddleware);

/**
 * Get the coin and entry data for the authenticated user.
 * Returns an array with all the coins he owns (name, symbol, and UUId), as well as the amount in their corresponding
 * entry.
 */
router.get('/', async function(req, res) {
    let connection;
    try{
        connection = await mysql.getConnection();
        const entries = await knex('entry')
            .connection(connection)
            .select('amount', 'coin.name', 'coin.symbol', knex.raw('bin_to_uuid(`coin`.`uuid`) as `uuid`'))
            .where('user', req.session.user)
            .join('coin', 'entry.coin', 'coin.id');
        connection.release();
        res.status(200).send(entries);
    }
    catch(err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred retrieving your coins. Please try again.'});
        if(connection) {
            connection.release();
        }
    }
});

module.exports = router;
