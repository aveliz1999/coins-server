const Joi = require('joi');
const mysql = require('../database/mysql');
const knex = require('knex')({client: "mysql"});

/**
 * Create a new transaction.
 * All the details of the the transaction must be sent in the body, except for the ID of the user initiating it which
 * is loaded as part of the session
 *
 * @param req Request object
 * @param res Response object
 */
exports.create = function(req, res) {
    const transactionSchema = {
        target: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required(),
        coin: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required(),
        amount: Joi.number()
            .integer()
            .greater(0)
            .required(),
        message: Joi.string()
            .max(64)
            .allow(''),
        charging: Joi.boolean()
            .required()
    };
    Joi.validate(req.body, transactionSchema, async function (err, transactionInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }

        const userId = req.session.user;
        const amount = transactionInfo.amount;
        let connection;

        try {
            connection = await mysql.getConnection();

            // Get the database ID of the coin and target used by their UUID
            let {id: coinId} = await knex('coin')
                .connection(connection)
                .select('id')
                .where('uuid', knex.raw('uuid_to_bin(?)', [transactionInfo.coin]))
                .first() || {};
            let {id: targetId} = await knex('user')
                .connection(connection)
                .select('id')
                .where('uuid', knex.raw('uuid_to_bin(?)', [transactionInfo.target]))
                .first() || {};

            // Check that the coin and target were valid, and that the user and target aren't the same
            if(!coinId) {
                return res.status(400).send({message: 'Please enter a valid coin'});
            }
            else if (!targetId) {
                return res.status(400).send({message: 'Please enter a valid target user'});
            }
            else if (targetId === userId) {
                return res.status(400).send({message: 'You cannot send to yourself'});
            }

            // If the charging value is true, create a request instead of a transaction
            if (transactionInfo.charging) {
                await knex('request')
                    .connection(connection)
                    .insert({
                        requester: userId,
                        sender: targetId,
                        coin: coinId,
                        amount: amount,
                        message: transactionInfo.message,
                        uuid: knex.raw('UUID_TO_BIN(UUID())'),
                        timestamp: knex.raw('NOW(3)')
                    });
                res.status(200).send({message: 'Sent request successfully.'});
                return connection.release();
            }

            await mysql.beginTransaction(connection);

            // Attempt to create the transaction and update the sender and receiver entry amounts
            const created = await handleCreateTransaction(coinId, userId, targetId, amount, transactionInfo.message, connection);

            // The transaction was not created due to the sender not having enough for this transaction
            if (!created) {
                await mysql.rollbackTransaction(connection);
                connection.release();
                return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
            }

            await mysql.commitTransaction(connection);

            res.status(200).send({message: 'Successfully created the transaction'});
            connection.release();
        }
        catch (err) {
            res.status(500).send({message: 'An error occurred creating the transaction. Please try again.'});
            console.error(err);

            if (connection) {
                try {
                    await mysql.rollbackTransaction(connection);
                    connection.release();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }

    });
};

/**
 * Handles creating the transaction entry and modifying the user coin entries as a part of a transaction
 *
 * @param {Number} coinId The id of the coin being exchanged
 * @param {Number} senderId The id of the user sending the coins
 * @param {Number} receiverId The id of the user receiving the coins
 * @param {Number} amount The amount of coins being sent
 * @param {String} message The message sent with the transaction
 * @param {Connection} connection The connection with the ongoing transaction
 * @returns {Promise<boolean>} If the transaction was successful, or false if the user didn't have enough to send
 */
const handleCreateTransaction = async function (coinId, senderId, receiverId, amount, message, connection) {
    // Get the coin entry of the sender
    const senderEntry = await knex('entry')
        .connection(connection)
        .select('id', 'amount')
        .where('coin', coinId)
        .where('user', senderId)
        .first();

    // Check if the sender has enough of the coin (or has any at all)
    if (!senderEntry || senderEntry.amount < amount) {
        return false;
    }

    // Get the coin entry of the receiver
    const receiverEntry = await knex('entry')
        .connection(connection)
        .select('id', 'amount')
        .where('coin', coinId)
        .where('user', receiverId)
        .first();

    // Update the sender and receiver's amount in their entry
    await knex('entry')
        .connection(connection)
        .update({amount: senderEntry.amount - amount})
        .where('id', senderEntry.id);

    // Update the receiver's entry if they have one, or create a new one with the amount if they don't
    if(receiverEntry) {
        await knex('entry')
            .connection(connection)
            .update({amount: receiverEntry.amount + amount})
            .where('id', receiverEntry.id);
    }
    else {
        await knex('entry')
            .connection(connection)
            .insert({
                user: receiverId,
                coin: coinId,
                amount: amount
            });
    }

    // Create the transaction
    await knex('transaction')
        .connection(connection)
        .insert({
            sender: senderId,
            receiver: receiverId,
            coin: coinId,
            amount: amount,
            message: message,
            timestamp: knex.raw('NOW(3)')
        });

    return true;
};