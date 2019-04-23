const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authenticatedMiddleware = require('../middleware/authenticated');

const mysql = require('../database/mysql');
const request = require('../database/request');
const entry = require('../database/entry');
const transaction = require('../database/transaction');

const controller = require('../controllers/transactions');

router.use(authenticatedMiddleware);

router.post('/', controller.create);




/**
 * Accept a request that was sent and create the transaction for the exchange.
 * The user must have enough coins to send and the request ID must be a valid pending request for that user.
 */
router.post('/acceptRequest', function (req, res) {
    const transactionSchema = {
        requestId: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required()
    };
    Joi.validate(req.body, transactionSchema, async function (err, values) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            let connection;
            try {
                const requestResult = await request.getByUuid(values.requestId);
                console.log(requestResult);
                if (requestResult && requestResult.sender === req.session.user) {
                    connection = await mysql.getConnection();
                    await mysql.beginTransaction(connection);

                    const created = await handleCreateTransaction(requestResult.coin, requestResult.sender, requestResult.requester, requestResult.amount, requestResult.message, connection);
                    if (!created) {
                        await mysql.rollbackTransaction(connection);
                        connection.release();
                        return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
                    }
                    await request.delete(requestResult.id);
                    await mysql.commitTransaction(connection);
                    connection.release();

                    res.status(200).send({message: 'Successfully created the transaction'});
                } else {
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
            } catch (err) {
                if (connection) {
                    try {
                        await mysql.rollbackTransaction(connection);
                        connection.release();
                    } catch (err) {
                        console.log(err);
                    }
                }
                if (err.message === 'Request not found') {
                    res.status(400).send({message: 'No request with that ID under your user'});
                } else {
                    res.status(500).send({message: 'An error occurred creating the transaction. Please try again.'});
                    console.log(err);
                }
            }
        }
    });
});

/**
 * Decline a request that was sent and delete it from the database
 */
router.post('/declineRequest', function (req, res) {
    const transactionSchema = {
        requestId: Joi.string()
            .uuid({
                version: [
                    'uuidv1'
                ]
            })
            .required()
    };
    Joi.validate(req.body, transactionSchema, async function (err, values) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            try {
                const requestResult = await request.getByUuid(values.requestId, ['id', 'sender']);
                if (requestResult && requestResult.sender === req.session.user) {
                    await request.delete(requestResult.id);
                    res.status(200).send({message: 'Successfully declined the request'})
                } else {
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
            } catch (err) {
                if (err.message === 'Request not found') {
                    res.status(400).send({message: 'No request with that ID under your user'});
                } else {
                    console.error(err);
                    res.status(500).send({message: 'An error occurred deleting the request. Please try again.'})
                }
            }
        }
    });
});

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
    const senderEntry = await entry.getByCoinAndUser(coinId, senderId, ['id', 'user', 'coin', 'amount'], connection);
    if (senderEntry.amount < amount) {
        return false;
    }
    const receiverEntry = await entry.getByCoinAndUser(coinId, receiverId, ['id', 'user', 'coin', 'amount'], connection);

    await entry.updateAmount(senderEntry.id, senderEntry.amount - amount, connection);
    await entry.updateAmount(receiverEntry.id, receiverEntry.amount + amount, connection);
    await transaction.create(senderId, receiverId, coinId, amount, message);

    return true;
};

/**
 * Handles searching for pending transaction requests that were sent to the user
 */
router.get('/search/requests/:previousId?', async function (req, res) {
    try {
        // Get the list of requests to display
        let requestList = await request.getListBySender(req.session.user,
            req.params.previousId ? req.params.previousId : Number.MAX_SAFE_INTEGER,
            '<',
            10,
            'id',
            'desc',
            ['id', 'amount', 'message', 'uuid', 'timestamp'],
            true,
            ['email', 'name', 'uuid'],
            ['name', 'symbol', 'uuid']);
        if (requestList.length === 0) {
            return res.status(200).send({
                requests: [],
                lastId: 0
            })
        }

        // Map the individual columns/fields to a JSON object and get rid of unnecessary values
        requestList = requestList.map(function (request) {
            Object.keys(request).forEach(function (key) {
                if (key.startsWith('sender_')) {
                    delete request[key];
                } else if (key.startsWith('requester_')) {
                    if (!request.user)
                        request.user = {};
                    request.user[key.substring(10)] = request[key];
                    delete request[key];
                } else if (key.startsWith('coin_')) {
                    if (!request.coin)
                        request.coin = {};
                    request.coin[key.substring(5)] = request[key];
                    delete request[key];
                }
            });
            delete request.id;
            return request;
        });

        const message = {
            requests: requestList,
            lastId: requestList[requestList.length - 1].id
        };
        res.status(200).send(message);
    } catch (err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the requests. Please try again.'})
    }
});

/**
 * Handles searching for transactions that were sent to or from the user
 */
router.get('/search/:previousId?', async function (req, res) {
    try {
        // Get the list of transactions to display
        let transactionsList = await transaction.getListByUsers(req.session.user,
            req.params.previousId ? req.params.previousId : Number.MAX_SAFE_INTEGER,
            '<',
            10,
            'id',
            'desc',
            ['id', 'amount', 'timestamp', 'message'],
            true,
            ['id', 'email', 'name', 'uuid'],
            ['name', 'symbol', 'uuid']);
        if (transactionsList.length === 0) {
            return res.status(200).send({
                transactions: [],
                lastId: 0
            })
        }

        // Map the individual columns/fields to a JSON object and get rid of unnecessary values
        transactionsList = transactionsList.map(function (transaction) {
            Object.keys(transaction).forEach(function (key) {
                if (key.startsWith('sender_')) {
                    if (!transaction.sender)
                        transaction.sender = {};
                    transaction.sender[key.substring(7)] = transaction[key];
                    delete transaction[key];
                } else if (key.startsWith('receiver_')) {
                    if (!transaction.receiver)
                        transaction.receiver = {};
                    transaction.receiver[key.substring(9)] = transaction[key];
                    delete transaction[key];
                } else if (key.startsWith('coin_')) {
                    if (!transaction.coin)
                        transaction.coin = {};
                    transaction.coin[key.substring(5)] = transaction[key];
                    delete transaction[key];
                }
            });

            // Pick the correct user (the one that isn't the session user) to send and map or delete the information
            if(transaction.sender.id === req.session.user) {
                delete transaction.sender;
                transaction.user = transaction.receiver;
                delete transaction.receiver;
                delete transaction.user.id;
                transaction.sent = true;
            }
            else{
                delete transaction.receiver;
                transaction.user = transaction.sender;
                delete transaction.sender;
                delete transaction.user.id;
                transaction.sent = false;
            }
            return transaction;
        });

        const lastId = transactionsList[transactionsList.length - 1].id;
        transactionsList = transactionsList.map(function(transaction) {
            delete transaction.id;
            return transaction;
        });

        const message = {
            transactions: transactionsList,
            lastId: lastId
        };
        res.status(200).send(message);
    } catch (err) {
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving the requests. Please try again.'})
    }
});


module.exports = router;
