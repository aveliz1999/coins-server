/**
 * Get the coin and entry data for the authenticated (in the session) user.
 * Returns an array with all the coins they owns (name, symbol, and UUId), as well as the amount in their corresponding
 * entry.
 *
 * @param req Request object
 * @param res Response object
 */
exports.getFromSession = async function(req, res) {
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
};