const express = require('express');
const router = express.Router();
const Joi = require('joi');

const mysql = require('../database/mysql');
const request = require('../database/request');
const user = require('../database/user');
const coin = require('../database/coin');
const entry = require('../database/entry');
const transaction = require('../database/transaction');

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
 * Create a new transaction.
 * All the details of the the transaction must be sent in the body, except for the ID of the user initiating it which
 * is loaded as part of the session under the variable 'user'
 */
router.post('/', function(req, res) {
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
    Joi.validate(req.body, transactionSchema, async function (err, values) {
        if(err) {
            res.status(400).send({message: err.message});
        } else {
            const userId = req.session.user;
            const amount = values.amount;
            let connection;
            try{
                let {id: coinId} = await coin.getByUuid(values.coin);
                let {id: targetId} = await user.getByUuid(values.target);

                if(values.charging) {
                    await request.create(userId, targetId, coinId, amount, values.message);
                    res.status(200).send({message: 'Sent request successfully.'});
                    return;
                }

                connection = await mysql.getConnection();
                await mysql.beginTransaction(connection);

                const created = await handleCreateTransaction(coinId, userId, targetId, amount, values.message, connection);
                if(!created) {
                    await mysql.rollbackTransaction(connection);
                    connection.release();
                    return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
                }
                await mysql.commitTransaction(connection);
                connection.release();

                res.status(200).send({message: 'Successfully created the transaction'});
            }
            catch(err) {
                if(connection){
                    try{
                        await mysql.rollbackTransaction(connection);
                        connection.release();
                    }
                    catch(err) {
                        console.log(err);
                    }
                }
                if(err.message === 'User not found') {
                    res.status(400).send({message: 'Please enter a valid user'});
                }
                else if(err.message === 'Coin not found') {
                    res.status(400).send({message: 'Please enter a valid coin'});
                }
                else{
                    res.status(500).send({message: 'An error occurred creating the transaction. Please try again.'});
                    console.log(err);
                }
            }
        }
    });
});

/**
 * Accept a request that was sent and create the transaction for the exchange.
 * The user must have enough coins to send and the request ID must be a valid pending request for that user.
 */
router.post('/acceptRequest', function(req, res) {
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
        if(err) {
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
                    if(!created) {
                        await mysql.rollbackTransaction(connection);
                        connection.release();
                        return res.status(400).send({message: 'Not enough of this coin to complete this transaction'});
                    }
                    await request.delete(requestResult.id);
                    await mysql.commitTransaction(connection);
                    connection.release();

                    res.status(200).send({message: 'Successfully created the transaction'});
                }
                else{
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
            }
            catch(err) {
                if(connection){
                    try{
                        await mysql.rollbackTransaction(connection);
                        connection.release();
                    }
                    catch(err) {
                        console.log(err);
                    }
                }
                if(err.message === 'Request not found') {
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
                else{
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
router.post('/declineRequest', function(req, res) {
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
                }
                else{
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
            }
            catch(err) {
                if(err.message === 'Request not found') {
                    res.status(400).send({message: 'No request with that ID under your user'});
                }
                else{
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
const handleCreateTransaction = async function(coinId, senderId, receiverId, amount, message, connection) {
    const senderEntry = await entry.getByCoinAndUser(coinId, senderId, ['id', 'user', 'coin', 'amount'], connection);
    if(senderEntry.amount < amount) {
        return false;
    }
    const receiverEntry = await entry.getByCoinAndUser(coinId, receiverId, ['id', 'user', 'coin', 'amount'], connection);

    await entry.updateAmount(senderEntry.id, senderEntry.amount - amount, connection);
    await entry.updateAmount(receiverEntry.id, receiverEntry.amount + amount, connection);
    await transaction.create(senderId, receiverId, coinId, amount, message);

    return true;
};
module.exports = router;
