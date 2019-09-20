const Joi = require('joi');
const Op = require('sequelize').Op;
const db = require('../models');
const sequelize = db.sequelize;
const Transaction = db.Transaction;
const Entry = db.Entry;

/**
 * Create a new transaction.
 * All the details of the the transaction must be sent in the body, except for the ID of the user initiating it which
 * is loaded as part of the session
 *
 * @param req Request object
 * @param res Response object
 */
exports.create = async function (req, res) {
    const transactionSchema = Joi.object({
        target: Joi.number()
            .integer()
            .greater(0)
            .required(),
        coin: Joi.number()
            .integer()
            .greater(0)
            .required(),
        amount: Joi.number()
            .integer()
            .greater(0)
            .required(),
        message: Joi.string()
            .max(64)
            .required()
            .allow('')
    });

    let transaction;
    try {
        const transactionInfo = await transactionSchema.validate(req.body);
        transaction = await sequelize.transaction();

        const targetEntry = await Entry.findOne({
            where: {
                user_id: transactionInfo.target,
                coin_id: transactionInfo.coin
            },
            transaction
        });
        if (!targetEntry) {
            res.status(400).send({message: 'No target found for that user ID and coin.'});
            return transaction.rollback();
        }
        if (targetEntry.user.id === req.session.user) {
            res.status(400).send({message: 'You cannot target yourself.'});
            return transaction.rollback();
        }

        const userEntry = await Entry.findOne({
            where: {
                user_id: req.session.user,
                coin_id: transactionInfo.coin
            },
            transaction
        });
        if (!userEntry || userEntry.amount < transactionInfo.amount) {
            res.status(400).send({message: 'You do not have enough coins.'});
            return transaction.rollback();
        }

        await userEntry.update({
            amount: userEntry.amount - transactionInfo.amount
        }, {transaction});
        await targetEntry.update({
            amount: targetEntry.amount + transactionInfo.amount
        }, {transaction});
        const createdTransaction = await Transaction.create({
            sender_id: req.session.user,
            receiver_id: transactionInfo.target,
            coin_id: transactionInfo.coin,
            amount: transactionInfo.amount,
            message: transactionInfo.message
        }, {transaction});

        await transaction.commit();

        return res.status(201).send(createdTransaction);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while creating the transaction. Please try again.'});

        if (transaction) {
            await transaction.rollback();
        }
    }
};

/**
 * Get a transaction from its id
 *
 * @param req Request object
 * @param res Response object
 */
exports.get = async function (req, res) {
    const transactionSchema = Joi.object({
        id: Joi.number()
            .integer()
            .greater(0)
            .required()
    });

    try {
        const transactionInfo = await transactionSchema.validate(req.params);

        const transaction = await Transaction.findOne({
            where: {
                id: transactionInfo.id
            }
        });
        if (!transaction) {
            return res.status(404).send({message: 'Transaction not found.'})
        }
        if (transaction.sender.id !== req.session.user && transaction.receiver.id !== req.session.user) {
            return res.status(403).send({message: 'Not authorized to view that transaction'});
        }

        return res.send(transaction);
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while retrieving that transactions. Please try again.'});
    }
};

/**
 * Handles searching for transactions that were sent to or from the user
 *
 * @param req Request object
 * @param res Response object
 */
exports.search = async function (req, res) {
    const transactionSchema = Joi.object({
        previousTransactionId: Joi.number()
            .integer()
            .greater(0)
    });
    if (!req.params.previousTransactionId) {
        req.params.previousTransactionId = Number.MAX_SAFE_INTEGER;
    }

    try {
        const transactionInfo = await transactionSchema.validate(req.params);

        const transactions = await Transaction.findAll({
            where: {
                [Op.or]: {
                    sender_id: req.session.user,
                    receiver_id: req.session.user
                },
                id: {
                    [Op.lte]: transactionInfo.previousTransactionId
                }
            },
            order: [['createdAt', 'DESC']],
            limit: 11
        });

        if (transactions.length === 0) {
            return res.send({
                transactions: [],
                nextId: 0
            });
        }

        return res.send({
            transactions: transactions.slice(0, 10),
            nextId: (transactions[10] || {id: 0}).id
        })
    } catch (err) {
        if (err.isJoi && err.name === 'ValidationError') {
            return res.status(400).send({message: err.message})
        }
        console.error(err);
        res.status(500).send({message: 'An error occurred while searching transactions. Please try again.'});
    }
};
