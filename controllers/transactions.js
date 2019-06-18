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
exports.create = function (req, res) {
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
            .required()
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
        try {
            // Get the database ID of the coin and target user by their UUID
            let {id: coinId} = await mysql.db('coin')
                .select('id')
                .where('uuid', knex.raw('uuid_to_bin(?)', [transactionInfo.coin]))
                .first() || {};
            let {id: targetId} = await mysql.db('user')
                .select('id')
                .where('uuid', knex.raw('uuid_to_bin(?)', [transactionInfo.target]))
                .first() || {};

            // Check that the coin and target were valid, and that the user and target aren't the same
            if (!coinId) {
                return res.status(400).send({message: 'Please enter a valid coin'});
            } else if (!targetId) {
                return res.status(400).send({message: 'Please enter a valid target user'});
            } else if (targetId === userId) {
                return res.status(400).send({message: 'You cannot send to yourself'});
            }

            // If the charging value is true, create a request instead of a transaction
            if (transactionInfo.charging) {
                await mysql.db('request')
                    .insert({
                        requester: userId,
                        sender: targetId,
                        coin: coinId,
                        amount,
                        message: transactionInfo.message,
                        uuid: knex.raw('UUID_TO_BIN(UUID())'),
                        timestamp: knex.raw('NOW(3)')
                    });
                res.status(200).send({message: 'Sent request successfully.'});
            }

            // Attempt to create the transaction and update the sender and receiver entry amounts
            await handleCreateTransaction(coinId, userId, targetId, amount, transactionInfo.message);

            res.status(200).send({message: 'Successfully created the transaction'});
        } catch (err) {
            if (err.message === 'Insufficient coins') {
                return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
            }

            console.error(err);
            res.status(500).send({message: 'An error occurred creating the transaction. Please try again.'});
        }
    });
};

/**
 * Accept a request that was sent and create the transaction for the exchange.
 * The user must have enough coins to send and the request ID must be a valid pending request for that user.
 *
 * @param req Request object
 * @param res Response object
 */
exports.acceptRequest = function (req, res) {
    const transactionSchema = {
        requestId: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required()
    };
    Joi.validate(req.body, transactionSchema, async function (err, requestInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }

        try {
            // Get the request information
            const requestResult = await mysql.db('request')
                .select('id', 'coin', 'sender', 'requester', 'amount', 'message')
                .where('uuid', knex.raw('uuid_to_bin(?)', [requestInfo.requestId]))
                .first();

            // Check if it's a valid request that belongs to the user
            if (requestResult && requestResult.sender === req.session.user) {
                // Attempt to create the transaction and update the sender and receiver entry amounts
                await handleCreateTransaction(requestResult.coin, requestResult.sender, requestResult.requester, requestResult.amount, requestResult.message);

                // Delete the request once the transaction is made
                await mysql.db('request')
                    .where('id', requestResult.id)
                    .del();

                res.status(200).send({message: 'Successfully created the transaction'});
            } else {
                res.status(400).send({message: 'No request with that ID under your user'});
            }
        } catch (err) {
            if (err.message === 'Insufficient coins') {
                return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
            }

            console.error(err);
            res.status(500).send({message: 'An error occurred creating the transaction. Please try again.'});
        }
    });
};

/**
 * Decline a request that was sent and delete it from the database.
 * The request ID must a valid request for the user.
 *
 * @param req Request object
 * @param res Response object
 */
exports.declineRequest = function (req, res) {
    const transactionSchema = {
        requestId: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required()
    };
    Joi.validate(req.body, transactionSchema, async function (err, requestInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }

        try {
            // Get the request
            const requestResult = await mysql.db('request')
                .select('id', 'sender')
                .where('uuid', knex.raw('uuid_to_bin(?)', [requestInfo.requestId]))
                .first();

            // If it's a valid request, delete it
            if (requestResult && requestResult.sender === req.session.user) {
                await mysql.db('request')
                    .where('id', requestResult.id)
                    .del();

                res.status(200).send({message: 'Successfully declined the request'});
            } else {
                res.status(400).send({message: 'No request with that ID under your user'});
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred deleting the request. Please try again.'});
        }

    });
};


/**
 * Handles searching for pending transaction requests that were sent to the user.
 * The previousId request parameter is an optional number ID
 *
 * @param req Request object
 * @param res Response object
 */
exports.searchRequests = async function (req, res) {
    const requestSchema = {
        previousRequest: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
    };
    Joi.validate(req.params, requestSchema, async function (err, requestInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }
        const {previousRequest} = requestInfo;

        try {
            let requestId;
            if (previousRequest) {
                ({id: requestId} = await mysql.db('request')
                    .select('id')
                    .where('uuid', knex.raw('uuid_to_bin(?)', previousRequest))
                    .where(function () {
                        this.where('sender', req.session.user)
                            .orWhere('receiver', req.session.user)
                    })
                    .first() || {});
            } else {
                requestId = Number.MAX_SAFE_INTEGER;
            }

            if (requestId === undefined) {
                return res.status(400).send({message: 'Transaction UUID does not exist'})
            }

            // Get the requests, along with the requesting user and coin that was requested
            let requestList = await mysql.db('request')
                .select('request.id',
                    'request.amount',
                    'request.message',
                    knex.raw('bin_to_uuid(`request`.`uuid`) as `uuid`'),
                    'request.timestamp',
                    'user.email as user_email',
                    'user.name as user_name',
                    knex.raw('bin_to_uuid(`user`.`uuid`) as `user_uuid`'),
                    'coin.name as coin_name',
                    'coin.symbol as coin_symbol',
                    knex.raw('bin_to_uuid(`coin`.`uuid`) as `coin_uuid`')
                )
                .where('sender', req.session.user)
                .where('request.id', '<', requestId)
                .join('user', 'request.requester', 'user.id')
                .join('coin', 'request.coin', 'coin.id')
                .orderBy('timestamp', 'desc')
                .limit(11);

            // If no requests are found, return an empty array with a last ID of 0 to signify there are no more
            if (requestList.length === 0) {
                return res.status(200).send([]);
            }

            // Map the information returned from the database into objects
            requestList = requestList.map(function (request) {
                return {
                    amount: request.amount,
                    message: request.message,
                    uuid: request.uuid,
                    user: {
                        email: request.user_email,
                        name: request.user_name,
                        uuid: request.user_uuid
                    },
                    coin: {
                        name: request.coin_name,
                        symbol: request.coin_symbol,
                        uuid: request.coin_uuid
                    },
                    timestamp: request.timestamp
                }
            });

            res.status(200).send({
                requests: requestList,
                moreAvailable: requestList.length === 11
            });
        } catch (err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while retrieving the requests. Please try again.'});
        }
    });
};

/**
 * Handles searching for transactions that were sent to or from the user
 */
exports.searchTransactions = async function (req, res) {
    const transactionSchema = {
        previousTransaction: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
    };
    Joi.validate(req.params, transactionSchema, async function (err, transactionInfo) {
        if (err) {
            return res.status(400).send({message: err.message});
        }
        const {previousTransaction} = transactionInfo;

        try {
            let transactionId;
            if (previousTransaction) {
                ({id: transactionId} = await mysql.db('transaction')
                    .select('id')
                    .where('uuid', knex.raw('uuid_to_bin(?)', previousTransaction))
                    .where(function () {
                        this.where('sender', req.session.user)
                            .orWhere('receiver', req.session.user)
                    })
                    .first() || {});
            } else {
                transactionId = Number.MAX_SAFE_INTEGER;
            }

            if (transactionId === undefined) {
                return res.status(400).send({message: 'Transaction UUID does not exist'})
            }

            /**
             * Get the list of transactions to display, along with the corresponding coin and the other user beside the
             * user requesting the list
             */
            let transactionsList = await mysql.db('transaction')
                .select(knex.raw('bin_to_uuid(`transaction`.`uuid`) as `uuid`'),
                    'transaction.amount',
                    'transaction.timestamp',
                    'transaction.message',
                    'sender.id as sender_id',
                    'sender.email as sender_email',
                    'sender.name as sender_name',
                    knex.raw('bin_to_uuid(`sender`.`uuid`) as `sender_uuid`'),
                    'receiver.id as receiver_id',
                    'receiver.email as receiver_email',
                    'receiver.name as receiver_name',
                    knex.raw('bin_to_uuid(`receiver`.`uuid`) as `receiver_uuid`'),
                    'coin.name as coin_name',
                    'coin.symbol as coin_symbol',
                    knex.raw('bin_to_uuid(`coin`.`uuid`) as `coin_uuid`'))
                .where(function () {
                    this.where('sender', req.session.user)
                        .orWhere('receiver', req.session.user)
                })
                .where('transaction.id', '<', transactionId)
                .join('user as sender', 'transaction.sender', 'sender.id')
                .join('user as receiver', 'transaction.receiver', 'receiver.id')
                .join('coin', 'transaction.coin', 'coin.id')
                .orderBy('timestamp', 'desc')
                .limit(11);

            // If not transactions are found, return an empty array with a last ID of 0 to signify there are no more
            if (transactionsList.length === 0) {
                return res.status(200).send([]);
            }

            // Map the information returned from the database into objects
            transactionsList = transactionsList.map(function (transaction) {
                const sentByUser = transaction.sender_id === req.session.user;
                return {
                    amount: transaction.amount,
                    timestamp: transaction.timestamp,
                    message: transaction.message,
                    user: sentByUser ? {
                        email: transaction.receiver_email,
                        name: transaction.receiver_name,
                        uuid: transaction.receiver_uuid
                    } : {
                        email: transaction.sender_email,
                        name: transaction.sender_name,
                        uuid: transaction.sender_uuid
                    },
                    sent: sentByUser,
                    coin: {
                        name: transaction.coin_name,
                        symbol: transaction.coin_symbol,
                        uuid: transaction.coin_uuid
                    },
                    uuid: transaction.uuid
                }
            });

            res.status(200).send({
                transactions: transactionsList,
                moreAvailable: transactionsList.length === 11
            });
        } catch (err) {
            console.error(err);
            res.status(500).send({message: 'An error occurred while retrieving the transactions. Please try again.'});
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
 * @returns {Promise<boolean>} If the transaction was successful, or false if the user didn't have enough to send
 */
const handleCreateTransaction = async function (coinId, senderId, receiverId, amount, message) {
    return mysql.db.transaction(async transaction => {
        // Get the coin entry of the sender
        const senderEntry = await transaction('entry')
            .select('id', 'amount')
            .where('coin', coinId)
            .where('user', senderId)
            .first();
        // Check if the sender has enough of the coin (or has any at all)
        if (!senderEntry || senderEntry.amount < amount) {
            throw Error('Insufficient coins');
        }

        // Get the coin entry of the receiver
        const receiverEntry = await transaction('entry')
            .select('id', 'amount')
            .where('coin', coinId)
            .where('user', receiverId)
            .first();

        // Update the sender and receiver's amount in their entry
        await transaction('entry')
            .update({amount: senderEntry.amount - amount})
            .where('id', senderEntry.id);

        // Update the receiver's entry if they have one, or create a new one with the amount if they don't
        if (receiverEntry) {
            await transaction('entry')
                .update({amount: receiverEntry.amount + amount})
                .where('id', receiverEntry.id);
        } else {
            await transaction('entry')
                .insert({
                    user: receiverId,
                    coin: coinId,
                    amount
                });
        }

        // Create the transaction
        await transaction('transaction')
            .insert({
                sender: senderId,
                receiver: receiverId,
                coin: coinId,
                amount,
                message,
                uuid: knex.raw('UUID_TO_BIN(UUID())'),
                timestamp: knex.raw('NOW(3)')
            });
    });
};
