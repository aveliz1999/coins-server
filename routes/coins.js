const express = require('express');
const router = express.Router();
const coin = require('../database/coin');
const entry = require('../database/entry');

/**
 * Middleware to disallow access to any transaction requests unless the user is logged in.
 * Returns a 403 Unauthorized if the user is not logged in.
 */
router.use(function(req, res, next) {
    if(req.session.user) {
        next();
    }
    else {
        res.status(403).send({message: 'Unauthorized'});
    }
});

/**
 * Get the coin and entry data for the authenticated user.
 * Returns an array with all the coins he owns (name, symbol, and UUId), as well as the amount in their corresponding
 * entry.
 */
router.get('/', async function(req, res) {
    try{
        const entries = await entry.getListByUser(req.session.user);
        const promises = entries.map(function(entry) {
            return coin.getById(entry.coin);
        });
        const coins = await Promise.all(promises);
        for(let coin = 0; coin < coins.length; coin++) {
            coins[coin].amount = entries[coin].amount;
            delete coins[coin].id;
        }
        res.status(200).send(coins);
    }
    catch(err) {
        console.log(err);
        res.status(500).send({message: 'An error occurred retrieving your coins. Please try again.'});
    }
});

module.exports = router;
