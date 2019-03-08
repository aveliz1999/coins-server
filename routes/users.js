const express = require('express');
const router = express.Router();
const Joi = require('joi');
const user = require('../database/user');

/**
 * Register new user with information sent in a POST request to /users.
 *
 * Requires an email of max 50 characters, a password between 8 and 32 characters (that follows a specific regex), and
 * a name between 4 and 45 characters.
 */
router.post('/', function (req, res) {
    const registerSchema = {
        email: Joi.string()
            .email()
            .max(50)
            .required(),
        password: Joi.string()
            .min(8)
            .max(32)
            .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
            .required(),
        name: Joi.string()
            .min(4)
            .max(45)
            .required()
    };
    Joi.validate(req.body, registerSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.create(value.email, value.password, value.name)
                .then(function () {
                    res.status(200).send({data: 'User created successfully'});
                })
                .catch(function (err) {
                    if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.match(/(?<=key ').+(?=')/)[0] === 'email_UNIQUE') {
                        res.status(400).send({message: 'A user with that email already exists.'})
                    } else {
                        res.status(500).send({message: 'An error occurred while creating your user. Please try again.'});
                    }
                });
        }
    });
});

/**
 * Attempt to log in a user with the information sent in a POST request to /users/login.
 * If the email and password match the information in the database, the user's UUID is sent in the response and the
 * user's ID is set in their session information.
 *
 * Requires an email of max 50 characters and a password between 8 and 32 characters (that follows a specific regex).
 */
router.post('/login', function (req, res) {
    const registerSchema = {
        email: Joi.string()
            .email()
            .max(50)
            .required(),
        password: Joi.string()
            .min(8)
            .max(32)
            .regex(/^[ \!"#\$%&'\(\)\*\+,\-\.\/\:;\<\=\>\?@\[\\\]\^_`\{\|\}~a-zA-Z0-9]+$/)
            .required()
    };
    Joi.validate(req.body, registerSchema, function (err, value) {
        if (err) {
            res.status(400).send({message: err.message});
        } else {
            user.comparePassword(value.email, value.password)
                .then(function (result) {
                    if (result) {
                        req.session.user = result.id;
                        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
                        res.status(200).send({data: result.uuid});
                    } else {
                        res.status(400).send({message: 'Incorrect username or password.'})
                    }
                })
                .catch(function (err) {
                    if (err.message === 'User not found') {
                        res.status(400).send({message: 'Incorrect username or password.'})
                    } else {
                        console.error(err);
                        res.status(500).send({message: 'An error occurred while logging in. Please try again.'})
                    }
                });
        }
    });
});

module.exports = router;
